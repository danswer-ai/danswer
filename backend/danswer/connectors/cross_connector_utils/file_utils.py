import json
import os
import zipfile
from collections.abc import Generator
from pathlib import Path
from typing import Any
from typing import IO

from pypdf import PdfReader

from danswer.utils.logger import setup_logger


logger = setup_logger()

_METADATA_FLAG = "#DANSWER_METADATA="


def read_pdf_file(file: IO[Any], file_name: str, pdf_pass: str | None = None) -> str:
    pdf_reader = PdfReader(file)

    # if marked as encrypted and a password is provided, try to decrypt
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

    try:
        return "\n".join(page.extract_text() for page in pdf_reader.pages)
    except Exception:
        logger.exception(f"Failed to read PDF {file_name}")
        return ""


def is_macos_resource_fork_file(file_name: str) -> bool:
    return os.path.basename(file_name).startswith("._") and file_name.startswith(
        "__MACOSX"
    )


def load_files_from_zip(
    zip_location: str | Path,
    ignore_macos_resource_fork_files: bool = True,
    ignore_dirs: bool = True,
) -> Generator[tuple[zipfile.ZipInfo, IO[Any]], None, None]:
    with zipfile.ZipFile(zip_location, "r") as zip_file:
        for file_info in zip_file.infolist():
            with zip_file.open(file_info.filename, "r") as file:
                if ignore_dirs and file_info.is_dir():
                    continue

                if ignore_macos_resource_fork_files and is_macos_resource_fork_file(
                    file_info.filename
                ):
                    continue
                yield file_info, file


def read_file(file_reader: IO[Any]) -> tuple[str, dict[str, Any]]:
    metadata = {}
    file_content_raw = ""
    for ind, line in enumerate(file_reader):
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        line = str(line)

        if ind == 0 and line.startswith(_METADATA_FLAG):
            metadata = json.loads(line.replace(_METADATA_FLAG, "", 1).strip())
        else:
            file_content_raw += line

    return file_content_raw, metadata
