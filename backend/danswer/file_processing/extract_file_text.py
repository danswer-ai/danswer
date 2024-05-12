import io
import json
import os
import re
import zipfile
from collections.abc import Iterator
from email.parser import Parser as EmailParser
from pathlib import Path
from typing import Any
from typing import IO

import chardet
import docx2txt  # type: ignore
import openpyxl  # type: ignore
import pptx  # type: ignore
from backend.danswer.file_processing.html_utils import parse_html_page_basic
from pypdf import PdfReader
from pypdf.errors import PdfStreamError

from danswer.utils.logger import setup_logger

logger = setup_logger()


PLAIN_TEXT_FILE_EXTENSIONS = [
    ".txt",
    ".md",
    ".mdx",
    ".conf",
    ".log",
    ".json",
    ".csv",
    ".tsv",
    ".xml",
    ".yml",
    ".yaml",
]


VALID_FILE_EXTENSIONS = PLAIN_TEXT_FILE_EXTENSIONS + [
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".eml",
    ".epub",
]


def is_text_file_extension(file_name: str) -> bool:
    return any(file_name.endswith(ext) for ext in PLAIN_TEXT_FILE_EXTENSIONS)


def get_file_ext(file_path_or_name: str | Path) -> str:
    _, extension = os.path.splitext(file_path_or_name)
    return extension


def check_file_ext_is_valid(ext: str) -> bool:
    return ext in VALID_FILE_EXTENSIONS


def detect_encoding(file: IO[bytes]) -> str:
    raw_data = file.read(50000)
    encoding = chardet.detect(raw_data)["encoding"] or "utf-8"
    file.seek(0)
    return encoding


def is_macos_resource_fork_file(file_name: str) -> bool:
    return os.path.basename(file_name).startswith("._") and file_name.startswith(
        "__MACOSX"
    )


# To include additional metadata in the search index, add a .danswer_metadata.json file
# to the zip file. This file should contain a list of objects with the following format:
# [{ "filename": "file1.txt", "link": "https://example.com/file1.txt" }]
def load_files_from_zip(
    zip_file_io: IO,
    ignore_macos_resource_fork_files: bool = True,
    ignore_dirs: bool = True,
) -> Iterator[tuple[zipfile.ZipInfo, IO[Any], dict[str, Any]]]:
    with zipfile.ZipFile(zip_file_io, "r") as zip_file:
        zip_metadata = {}
        try:
            metadata_file_info = zip_file.getinfo(".danswer_metadata.json")
            with zip_file.open(metadata_file_info, "r") as metadata_file:
                try:
                    zip_metadata = json.load(metadata_file)
                    if isinstance(zip_metadata, list):
                        # convert list of dicts to dict of dicts
                        zip_metadata = {d["filename"]: d for d in zip_metadata}
                except json.JSONDecodeError:
                    logger.warn("Unable to load .danswer_metadata.json")
        except KeyError:
            logger.info("No .danswer_metadata.json file")

        for file_info in zip_file.infolist():
            with zip_file.open(file_info.filename, "r") as file:
                if ignore_dirs and file_info.is_dir():
                    continue

                if ignore_macos_resource_fork_files and is_macos_resource_fork_file(
                    file_info.filename
                ):
                    continue
                yield file_info, file, zip_metadata.get(file_info.filename, {})


def _extract_danswer_metadata(line: str) -> dict | None:
    html_comment_pattern = r"<!--\s*DANSWER_METADATA=\{(.*?)\}\s*-->"
    hashtag_pattern = r"#DANSWER_METADATA=\{(.*?)\}"

    html_comment_match = re.search(html_comment_pattern, line)
    hashtag_match = re.search(hashtag_pattern, line)

    if html_comment_match:
        json_str = html_comment_match.group(1)
    elif hashtag_match:
        json_str = hashtag_match.group(1)
    else:
        return None

    try:
        return json.loads("{" + json_str + "}")
    except json.JSONDecodeError:
        return None


def read_text_file(
    file: IO,
    encoding: str = "utf-8",
    errors: str = "replace",
    ignore_danswer_metadata: bool = True,
) -> tuple[str, dict]:
    metadata = {}
    file_content_raw = ""
    for ind, line in enumerate(file):
        try:
            line = line.decode(encoding) if isinstance(line, bytes) else line
        except UnicodeDecodeError:
            line = (
                line.decode(encoding, errors=errors)
                if isinstance(line, bytes)
                else line
            )

        if ind == 0:
            metadata_or_none = (
                None if ignore_danswer_metadata else _extract_danswer_metadata(line)
            )
            if metadata_or_none is not None:
                metadata = metadata_or_none
            else:
                file_content_raw += line
        else:
            file_content_raw += line

    return file_content_raw, metadata


def read_pdf_file(file: IO[Any], file_name: str, pdf_pass: str | None = None) -> str:
    try:
        pdf_reader = PdfReader(file)

        # If marked as encrypted and a password is provided, try to decrypt
        if pdf_reader.is_encrypted and pdf_pass is not None:
            decrypt_success = False
            if pdf_pass is not None:
                try:
                    decrypt_success = pdf_reader.decrypt(pdf_pass) != 0
                except Exception:
                    logger.error(f"Unable to decrypt pdf {file_name}")
            else:
                logger.info(f"No Password available to to decrypt pdf {file_name}")

            if not decrypt_success:
                # By user request, keep files that are unreadable just so they
                # can be discoverable by title.
                return ""

        return "\n".join(page.extract_text() for page in pdf_reader.pages)
    except PdfStreamError:
        logger.exception(f"PDF file {file_name} is not a valid PDF")
    except Exception:
        logger.exception(f"Failed to read PDF {file_name}")

    # File is still discoverable by title
    # but the contents are not included as they cannot be parsed
    return ""


def extract_file_text(
    file_name: str,
    file: IO[Any],
    additional_info: dict[str, str] | None = None,
) -> str:
    extension = get_file_ext(file_name)
    if not check_file_ext_is_valid(extension):
        raise RuntimeError("Unprocessable file type")

    if additional_info is None:
        additional_info = {}

    if extension == ".pdf":
        return read_pdf_file(
            file=file, file_name=file_name, pdf_pass=additional_info.get("pdf_pass")
        )

    elif extension == ".docx":
        return docx2txt.process(file)

    elif extension == ".pptx":
        presentation = pptx.Presentation(file)
        text_content = []
        for slide_number, slide in enumerate(presentation.slides, start=1):
            extracted_text = f"\nSlide {slide_number}:\n"
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    extracted_text += shape.text + "\n"
            text_content.append(extracted_text)
        return "\n\n".join(text_content)

    elif extension == ".xlsx":
        workbook = openpyxl.load_workbook(file)
        text_content = []
        for sheet in workbook.worksheets:
            sheet_string = "\n".join(
                ",".join(map(str, row))
                for row in sheet.iter_rows(min_row=1, values_only=True)
            )
            text_content.append(sheet_string)
        return "\n\n".join(text_content)

    elif extension == ".eml":
        text_file = io.TextIOWrapper(file, encoding=detect_encoding(file))
        parser = EmailParser()
        message = parser.parse(text_file)
        text_content = []
        for part in message.walk():
            if part.get_content_type().startswith("text/plain"):
                text_content.append(part.get_payload())
        return "\n\n".join(text_content)

    elif extension == ".epub":
        with zipfile.ZipFile(file) as epub:
            text_content = []
            for item in epub.infolist():
                if item.filename.endswith(".xhtml") or item.filename.endswith(".html"):
                    with epub.open(item) as html_file:
                        text_content.append(parse_html_page_basic(html_file))
            return "\n\n".join(text_content)

    else:
        encoding = detect_encoding(file)
        file_content_raw, _ = read_text_file(file, encoding=encoding)
        return file_content_raw
