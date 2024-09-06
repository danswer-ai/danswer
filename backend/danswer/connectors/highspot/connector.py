import io
import mimetypes
import concurrent.futures
from datetime import datetime, timezone
from typing import Any, Optional, List

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector, SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.utils.logger import setup_logger
from danswer.connectors.highspot.lib.highspot import HighSpot
from danswer.connectors.highspot.lib.models.simple import JsonObject
from danswer.connectors.highspot.lib.models.enums import ContentTypes

logger = setup_logger("HighSpot")

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
        requested_objects: List[str] = [],
        continue_on_failure: bool = True,
        highspot_subdomain: str = "",
        highspot_api_url: str = "",
    ) -> None:
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure
        self.highspot_subdomain = highspot_subdomain
        self.highspot_api_url = highspot_api_url
        self.highspot_client: Optional[HighSpot] = None

    def load_credentials(self, credentials: dict[str, Any]) -> None:
        try:
            self.highspot_client = HighSpot(
                key=credentials["highspot_api_key"],
                secret=credentials["highspot_api_secret"],
                server=self.highspot_api_url,
            )
        except KeyError as e:
            raise ConnectorMissingCredentialError(f"Missing required credential: {e}")

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._fetch_docs()

    def poll_source(
        self,
        start: Optional[SecondsSinceUnixEpoch] = None,
        end: Optional[SecondsSinceUnixEpoch] = None,
    ) -> GenerateDocumentsOutput:
        yield from self._fetch_docs(start, end)

    def _fetch_docs(
        self,
        start: Optional[SecondsSinceUnixEpoch] = None,
        end: Optional[SecondsSinceUnixEpoch] = None,
    ) -> GenerateDocumentsOutput:
        if not self.highspot_client:
            raise ValueError("HighSpot client not initialized. Call load_credentials first.")

        spots = self.highspot_client.list_spots()
        if not spots.collection:
            logger.warning("No spots found in HighSpot.")
            return

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [executor.submit(self._process_spot, spot) for spot in spots.collection]
            for future in concurrent.futures.as_completed(futures):
                yield from self._process_future_results(future)

    def _process_spot(self, spot: JsonObject) -> List[Document]:
        logger.debug(f"Fetching items for spot: {spot.title} with ID: {spot.id}")
        items = self.highspot_client.list_items(spot.id)
        return [self._get_document_for_item(item) for item in items.collection]

    def _process_future_results(self, future: concurrent.futures.Future) -> GenerateDocumentsOutput:
        try:
            documents = future.result()
            for batch in self._batch_documents(documents):
                yield batch
        except Exception as e:
            if not self.continue_on_failure:
                raise
            logger.error(f"Error processing spot: {e}")

    def _batch_documents(self, documents: List[Document]) -> GenerateDocumentsOutput:
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i : i + self.batch_size]
            logger.debug(f"Yielding batch of size {len(batch)}")
            yield batch

    def _get_document_for_item(self, item: JsonObject) -> Document:
        link = f"https://{self.highspot_subdomain}.highspot.com/items/{item.id}"
        text = self._get_item_text(item, link)

        # Not useful
        if hasattr(item, 'content_owners'):
            del item.content_owners

        try:
            return Document(
                id=item.id,
                source=DocumentSource.HIGHSPOT,
                semantic_identifier=item.title,
                doc_updated_at=datetime.fromisoformat(item.date_updated).astimezone(timezone.utc),
                metadata=self._clean_metadata(item.__dict__),
                sections=[Section(link=link, text=text)],
            )
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            logger.debug("Creating document with empty metadata.")
            return Document(
                id=item.id,
                source=DocumentSource.HIGHSPOT,
                semantic_identifier=item.title,
                doc_updated_at=datetime.fromisoformat(item.date_updated).astimezone(timezone.utc),
                metadata={},
                sections=[Section(link=link, text=text)],
            )

    def _get_item_text(self, item: JsonObject, link: str) -> str:
        if item.can_download and item.content_type not in (ContentTypes.VIDEO, ContentTypes.IMAGE):
            try:
                file_ext = self._get_file_extension(item)
                filename = f"{item.get('content_name', item.title)}{file_ext}"
                return extract_file_text(file_name=filename, file=self._get_downloadable_as_io(item))
            except Exception as e:
                logger.error(f"Error extracting text from file: {e}")
                return f"Error extracting text: {str(e)}"
        else:
            return (
                f"Type: {item.get('content_type', 'Unknown')}\n"
                f"Title: {item.get('title', 'Untitled')}\n"
                f"Description: {item.get('description', 'No description')}\n"
                f"URL: {item.get('url') or link}"
            )

    def _get_downloadable_as_io(self, item: JsonObject) -> io.BytesIO:
        if not self.highspot_client:
            raise ValueError("HighSpot client not initialized. Call load_credentials first.")
        resp = self.highspot_client.get_item_content(item.id)
        return io.BytesIO(resp.content)

    def _get_file_extension(self, item: JsonObject) -> str:
        file_ext = mimetypes.guess_extension(item.get("mime_type", ""))
        if not file_ext:
            file_ext = next((ext for key, ext in TEXT_FILETYPES.items() if item.get("mime_type", "").startswith(key)), "")
        return file_ext

    def _clean_metadata(self, metadata: Any) -> Any:
        if isinstance(metadata, dict):
            cleaned = {}
            for k, v in metadata.items():
                if isinstance(k, str):
                    cleaned_v = self._clean_metadata(v)
                    if cleaned_v not in (None, {}, []):
                        cleaned[k] = cleaned_v
            return cleaned or None
        elif isinstance(metadata, list):
            cleaned = [
                item for item in (self._clean_metadata(v) for v in metadata)
                if item not in (None, {}, [])
            ]
            return cleaned or None
        elif metadata not in (None, "", {}, []):
            return metadata
        else:
            return None
