import os
import zipfile
from collections.abc import Generator
from enum import Enum
from pathlib import Path
from typing import Any
from typing import IO

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logging import setup_logger


logger = setup_logger()

_LINK_METADATA_FLAG = "#LINK="


def _get_files_from_zip(
    zip_location: Path,
) -> Generator[tuple[str, IO[Any]], None, None]:
    with zipfile.ZipFile(zip_location, "r") as zip_file:
        for file_name in zip_file.namelist():
            with zip_file.open(file_name, "r") as file:
                yield file_name, file


def _get_files_from_directory(
    dir_location: Path,
) -> Generator[tuple[str, IO[Any]], None, None]:
    for file_name in os.listdir(dir_location):
        path = dir_location / file_name
        if os.path.isdir(path):
            logger.warning(f"Skipping file '{file_name}' because it is a directory")
            continue

        with open(path, "r") as file:
            yield file_name, file


def _process_file(file_name: str, file: IO[bytes] | IO[str]) -> list[Document]:
    _, extension = os.path.splitext(file_name)
    if extension not in [".txt"]:
        logger.warning(f"Skipping file '{file_name}' with extension '{extension}'")
        return []

    link = ""
    file_content_raw = ""
    for ind, line in enumerate(file):
        try:
            if isinstance(line, bytes):
                line = line.decode("utf-8")
            line = str(line)

            if ind == 0 and line.startswith(_LINK_METADATA_FLAG):
                link = line.replace(_LINK_METADATA_FLAG, "", 1).strip()
            file_content_raw += line
        except Exception:
            logger.exception(f"Unable to process line in file '{file_name}'")

    return [
        Document(
            id=file_name,
            sections=[Section(link=link, text=file_content_raw)],
            source=DocumentSource.FILE,
            semantic_identifier=file_name,
            metadata={},
        )
    ]


class FileType(str, Enum):
    DIRECTORY = "directory"
    ZIP = "zip"


class LocalFileConnector(LoadConnector):
    def __init__(
        self,
        file_location: Path | str,
        file_type: FileType,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        if isinstance(file_location, str):
            file_location = Path(file_location)
        self.file_location = file_location
        self.file_type = file_type
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        pass

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.file_type == FileType.ZIP:
            files = _get_files_from_zip(self.file_location)
        elif self.file_type == FileType.DIRECTORY:
            files = _get_files_from_directory(self.file_location)
        else:
            raise ValueError(f"Unsupported file type: {self.file_type}")

        documents: list[Document] = []
        for file_name, file in files:
            documents.extend(_process_file(file_name, file))

            if len(documents) >= self.batch_size:
                yield documents
                documents = []

        if documents:
            yield documents


if __name__ == "__main__":
    connector = LocalFileConnector(
        file_location=Path("/Users/chrisweaver/projects/danswer/backend/random.zip"),
        file_type=FileType.ZIP,
    )
    doc_batch_generator = connector.load_from_state()
    for doc_batch in doc_batch_generator:
        for doc in doc_batch:
            print(doc)

    connector = LocalFileConnector(
        file_location=Path("/Users/chrisweaver/projects/danswer/backend/random"),
        file_type=FileType.DIRECTORY,
    )
    doc_batch_generator = connector.load_from_state()
    for doc_batch in doc_batch_generator:
        for doc in doc_batch:
            print(doc)
