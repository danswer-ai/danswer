import os
import zipfile
from collections.abc import Generator
from enum import Enum
from pathlib import Path
from typing import Any
from typing import IO

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.file.utils import check_file_ext_is_valid
from danswer.connectors.file.utils import get_file_ext
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logging import setup_logger


logger = setup_logger()

_LINK_METADATA_FLAG = "#LINK="


def _get_files_from_zip(
    zip_location: str | Path,
) -> Generator[tuple[str, IO[Any]], None, None]:
    with zipfile.ZipFile(zip_location, "r") as zip_file:
        for file_name in zip_file.namelist():
            with zip_file.open(file_name, "r") as file:
                yield file_name, file


def _open_files_at_location(
    file_path: str | Path,
) -> Generator[tuple[str, IO[Any]], Any, None]:
    extension = get_file_ext(file_path)

    if extension == ".zip":
        yield from _get_files_from_zip(file_path)
    elif extension == ".txt":
        with open(file_path, "r") as file:
            yield os.path.basename(file_path), file
    else:
        logger.warning(f"Skipping file '{file_path}' with extension '{extension}'")


def _process_file(file_name: str, file: IO[Any]) -> list[Document]:
    extension = get_file_ext(file_name)
    if not check_file_ext_is_valid(extension):
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


class LocalFileConnector(LoadConnector):
    def __init__(
        self,
        file_locations: list[Path | str],
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.file_locations = [Path(file_location) for file_location in file_locations]
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        pass

    def load_from_state(self) -> GenerateDocumentsOutput:
        documents: list[Document] = []
        for file_location in self.file_locations:
            files = _open_files_at_location(file_location)

            for file_name, file in files:
                documents.extend(_process_file(file_name, file))

                if len(documents) >= self.batch_size:
                    yield documents
                    documents = []

        if documents:
            yield documents


if __name__ == "__main__":
    connector = LocalFileConnector(
        file_locations=[Path("/Users/chrisweaver/projects/danswer/backend/random.zip")],
    )
    doc_batch_generator = connector.load_from_state()
    for doc_batch in doc_batch_generator:
        for doc in doc_batch:
            print(doc)

    connector = LocalFileConnector(
        file_locations=[
            Path("/Users/chrisweaver/projects/danswer/backend/random/test.txt")
        ],
    )
    doc_batch_generator = connector.load_from_state()
    for doc_batch in doc_batch_generator:
        for doc in doc_batch:
            print(doc)
