import fitz
import json
import os
import pytesseract
import re
import zipfile
from collections.abc import Generator
from pathlib import Path
from PIL import Image
from typing import Any
from typing import IO

import chardet
from pypdf import PdfReader
from pypdf.errors import PdfStreamError


from danswer.utils.logger import setup_logger


logger = setup_logger()


def extract_metadata(line: str) -> dict | None:
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


def read_pdf_file(file: IO[Any],
                  file_name: str,
                  pdf_pass: str | None = None,
                  use_ocr: bool = False) -> str:
    try:
        pdf_reader = PdfReader(file)

        if pdf_reader.is_encrypted and pdf_pass:
            try:
                if pdf_reader.decrypt(pdf_pass) == 0:
                    raise Exception("PDF decryption failed.")
            except Exception:
                logger.error(f"Unable to decrypt pdf {file_name}")
                return ""
        if use_ocr:
            file.seek(0)  # Reset the file pointer to the beginning of the file
            pdf_document = fitz.open(stream=file.read(), filetype="pdf")
            return extract_text_from_pdf_using_ocr(pdf_document, file_name)

        return "\n".join(page.extract_text() for page in pdf_reader.pages)

    except PdfStreamError:
        logger.exception(f"PDF file {file_name} is not a valid PDF")
    except Exception as e:
        logger.exception(f"Failed to read PDF {file_name}: {e}")

    return ""


def extract_text_from_pdf_using_ocr(pdf_document, file_name):
    logger.info(f"Starting OCR processing for document: {file_name}")
    extracted_text = ""

    for page_number, page in enumerate(pdf_document):
        try:
            pix = page.get_pixmap()
            image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            logger.debug(f"Extracting text from page {page_number + 1} using OCR.")
            text = pytesseract.image_to_string(image, lang="eng")

            extracted_text += text
        except Exception as e:
            logger.exception(f"Failed to process page {page_number + 1} with OCR: {e}")

    logger.info(f"Finished OCR processing for document: {file_name}")

    return extracted_text


def is_macos_resource_fork_file(file_name: str) -> bool:
    return os.path.basename(file_name).startswith("._") and file_name.startswith(
        "__MACOSX"
    )


# To include additional metadata in the search index, add a .danswer_metadata.json file
# to the zip file. This file should contain a list of objects with the following format:
# [{ "filename": "file1.txt", "link": "https://example.com/file1.txt" }]
def load_files_from_zip(
    zip_location: str | Path,
    ignore_macos_resource_fork_files: bool = True,
    ignore_dirs: bool = True,
) -> Generator[tuple[zipfile.ZipInfo, IO[Any], dict[str, Any]], None, None]:
    with zipfile.ZipFile(zip_location, "r") as zip_file:
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


def detect_encoding(file_path: str | Path) -> str:
    with open(file_path, "rb") as file:
        raw_data = file.read(50000)  # Read a portion of the file to guess encoding
    return chardet.detect(raw_data)["encoding"] or "utf-8"


def read_file(
    file_reader: IO[Any], encoding: str = "utf-8", errors: str = "replace"
) -> tuple[str, dict]:
    metadata = {}
    file_content_raw = ""
    for ind, line in enumerate(file_reader):
        try:
            line = line.decode(encoding) if isinstance(line, bytes) else line
        except UnicodeDecodeError:
            line = (
                line.decode(encoding, errors=errors)
                if isinstance(line, bytes)
                else line
            )

        if ind == 0:
            metadata_or_none = extract_metadata(line)
            if metadata_or_none is not None:
                metadata = metadata_or_none
            else:
                file_content_raw += line
        else:
            file_content_raw += line

    return file_content_raw, metadata


def is_text_file_extension(file_name: str) -> bool:
    extensions = (
        ".txt",
        ".mdx",
        ".md",
        ".conf",
        ".log",
        ".json",
        ".xml",
        ".yaml",
        ".yml",
        ".json",
    )
    return any(file_name.endswith(ext) for ext in extensions)