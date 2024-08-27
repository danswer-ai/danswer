import io
import mimetypes
import concurrent.futures

from datetime import datetime
from datetime import timezone
from typing import Any
from typing import Optional

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.utils.logger import setup_logger
from danswer.connectors.highspot.lib.highspot import HighSpot
from danswer.connectors.highspot.lib.models.simple import JsonObject
from danswer.connectors.highspot.lib.models.enums import ContentTypes


logger = setup_logger()

TEXT_FILETYPES = {
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/html": ".html",
    "application/pdf": ".pdf",
}


class HighSpotConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        requested_objects: list[str] = [],
        continue_on_failure: bool = True,
        highspot_subdomain: str = "",
        highspot_api_url: str = "",
    ) -> None:
        self.batch_size = batch_size
        self.highspot_client: HighSpot
        self.continue_on_failure = continue_on_failure
        self.highspot_subdomain = highspot_subdomain
        self.highspot_api_url = highspot_api_url

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        try:
            self.highspot_client = HighSpot(
                key=credentials["highspot_api_key"],
                secret=credentials["highspot_api_secret"],
                server=self.highspot_api_url,
            )
        except KeyError as e:
            raise ConnectorMissingCredentialError(f"Missing required credential: {e}")

        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._fetch_docs()

    def poll_source(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        yield from self._fetch_docs(start, end)

    # Internal functions

    def _fetch_docs(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        doc_batch: list[Document] = []

        spots = self.highspot_client.list_spots()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = []
            for spot in spots.collection:
                logger.info(f"Fetching items for spot: {spot.title} with ID: {spot.id}")
                items = self.highspot_client.list_items(spot.id)

                for item in items.collection:
                    logger.info(f"Fetching item: {item.title} with ID: {item.id}")
                    futures.append(executor.submit(self._get_document_for_item, item))

            for future in concurrent.futures.as_completed(futures):
                doc_batch.append(future.result())

                if len(doc_batch) >= 15:
                    logger.debug(f"Yielding batch of size {len(doc_batch)}")
                    yield doc_batch
                    doc_batch = []

        if doc_batch:
            logger.debug(f"Yielding batch of size {len(doc_batch)}")
            yield doc_batch

    def _get_downloadable_as_io(self, item: JsonObject) -> io.BytesIO:
        resp = self.highspot_client.get_item_content(item.id)
        return io.BytesIO(resp.content)

    def _get_document_for_item(self, item: JsonObject) -> Document:
        link: str = f"https://{self.highspot_subdomain}.highspot.com/items/{item.id}"
        text: str
        filename: str

        if item.can_download and item.content_type not in (ContentTypes.VIDEO, ContentTypes.IMAGE):
            file_ext = self._get_file_extension(item)
            filename = item.get("content_name", item.title)

            if file_ext and not filename.lower().endswith(file_ext):
                filename += file_ext

            text = extract_file_text(file_name=filename, file=self._get_downloadable_as_io(item))

        else:
            text = (
                f"Type: {item.content_type}"
                + f"Title: {item.title}"
                + f"{item.content_type} Description: {item.description}"
                + f"{item.content_type} URL: {item.get('url') or link}"
            )

        return Document(
            id=item.id,
            source=DocumentSource.HIGHSPOT,
            semantic_identifier=item.title,
            doc_updated_at=datetime.fromisoformat(item.date_updated).astimezone(timezone.utc),
            metadata=self._clean_metadata(item.__dict__),
            sections=[
                Section(
                    link=link,
                    text=text,
                )
            ],
        )

    def _get_file_extension(self, item: JsonObject) -> str:
        file_ext = mimetypes.guess_extension(item.get("mime_type", " "))
        if not file_ext:
            for key in TEXT_FILETYPES.keys():
                if item.mime_type.startswith(key):
                    file_ext = TEXT_FILETYPES[key]
                    break

        return file_ext or ""

    def _get_text_from_io(self, io_obj: io.BytesIO, item: JsonObject) -> Optional[str]:
        file_ext = mimetypes.guess_extension(item.get("mime_type", " "))
        if not file_ext:
            for key in TEXT_FILETYPES.keys():
                if item.mime_type.startswith(key):
                    file_ext = TEXT_FILETYPES[key]
                    break

        if not file_ext:
            logger.warning(f"Could not determine file extension for item: {item.title} with ID: {item.id}")
            return None

        filename = item.content_name
        if file_ext and not filename.lower().endswith(file_ext):
            filename += file_ext

        try:
            return extract_file_text(file=io_obj, file_name=filename)
        except Exception as e:
            if not self.continue_on_failure:
                logger.exception("Ran into exception when pulling a file from HighSpot")
                raise e
            else:
                logger.warning(f"Ran into exception while extracting text from file. Error: {e}")
                return None

    def _clean_metadata(self, metadata: dict[str, Any]) -> dict[str, Any]:
        def is_valid(value):
            if isinstance(value, str):
                return True
            elif isinstance(value, list):
                return all(is_valid(item) for item in value)
            return False

        if not isinstance(metadata, dict):
            raise ValueError("Input must be a dictionary")

        return {
            k: self._clean_metadata(v) if isinstance(v, dict) else v
            for k, v in metadata.items()
            if isinstance(k, str) and is_valid(v)
        }
