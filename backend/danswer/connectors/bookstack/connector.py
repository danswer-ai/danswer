import html
import time
from collections.abc import Callable
from datetime import datetime
from typing import Any

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.bookstack.client import BookStackApiClient
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.html_utils import parse_html_page_basic


class BookstackConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size
        self.bookstack_client: BookStackApiClient | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.bookstack_client = BookStackApiClient(
            base_url=credentials["bookstack_base_url"],
            token_id=credentials["bookstack_api_token_id"],
            token_secret=credentials["bookstack_api_token_secret"],
        )
        return None

    @staticmethod
    def _get_doc_batch(
        batch_size: int,
        bookstack_client: BookStackApiClient,
        endpoint: str,
        transformer: Callable[[BookStackApiClient, dict], Document],
        start_ind: int,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> tuple[list[Document], int]:
        params = {
            "count": str(batch_size),
            "offset": str(start_ind),
            "sort": "+id",
        }

        if start:
            params["filter[updated_at:gte]"] = datetime.utcfromtimestamp(
                start
            ).strftime("%Y-%m-%d %H:%M:%S")

        if end:
            params["filter[updated_at:lte]"] = datetime.utcfromtimestamp(end).strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        batch = bookstack_client.get(endpoint, params=params).get("data", [])
        doc_batch = [transformer(bookstack_client, item) for item in batch]

        return doc_batch, len(batch)

    @staticmethod
    def _book_to_document(
        bookstack_client: BookStackApiClient, book: dict[str, Any]
    ) -> Document:
        url = bookstack_client.build_app_url("/books/" + str(book.get("slug")))
        title = str(book.get("name", ""))
        text = book.get("name", "") + "\n" + book.get("description", "")
        updated_at_str = (
            str(book.get("updated_at")) if book.get("updated_at") is not None else None
        )
        return Document(
            id="book__" + str(book.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Book: " + title,
            title=title,
            doc_updated_at=(
                time_str_to_utc(updated_at_str) if updated_at_str is not None else None
            ),
            metadata={"type": "book"},
        )

    @staticmethod
    def _chapter_to_document(
        bookstack_client: BookStackApiClient, chapter: dict[str, Any]
    ) -> Document:
        url = bookstack_client.build_app_url(
            "/books/"
            + str(chapter.get("book_slug"))
            + "/chapter/"
            + str(chapter.get("slug"))
        )
        title = str(chapter.get("name", ""))
        text = chapter.get("name", "") + "\n" + chapter.get("description", "")
        updated_at_str = (
            str(chapter.get("updated_at"))
            if chapter.get("updated_at") is not None
            else None
        )
        return Document(
            id="chapter__" + str(chapter.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Chapter: " + title,
            title=title,
            doc_updated_at=(
                time_str_to_utc(updated_at_str) if updated_at_str is not None else None
            ),
            metadata={"type": "chapter"},
        )

    @staticmethod
    def _shelf_to_document(
        bookstack_client: BookStackApiClient, shelf: dict[str, Any]
    ) -> Document:
        url = bookstack_client.build_app_url("/shelves/" + str(shelf.get("slug")))
        title = str(shelf.get("name", ""))
        text = shelf.get("name", "") + "\n" + shelf.get("description", "")
        updated_at_str = (
            str(shelf.get("updated_at"))
            if shelf.get("updated_at") is not None
            else None
        )
        return Document(
            id="shelf:" + str(shelf.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Shelf: " + title,
            title=title,
            doc_updated_at=(
                time_str_to_utc(updated_at_str) if updated_at_str is not None else None
            ),
            metadata={"type": "shelf"},
        )

    @staticmethod
    def _page_to_document(
        bookstack_client: BookStackApiClient, page: dict[str, Any]
    ) -> Document:
        page_id = str(page.get("id"))
        title = str(page.get("name", ""))
        page_data = bookstack_client.get("/pages/" + page_id, {})
        url = bookstack_client.build_app_url(
            "/books/"
            + str(page.get("book_slug"))
            + "/page/"
            + str(page_data.get("slug"))
        )
        page_html = "<h1>" + html.escape(title) + "</h1>" + str(page_data.get("html"))
        text = parse_html_page_basic(page_html)
        updated_at_str = (
            str(page_data.get("updated_at"))
            if page_data.get("updated_at") is not None
            else None
        )
        time.sleep(0.1)
        return Document(
            id="page:" + page_id,
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Page: " + str(title),
            title=str(title),
            doc_updated_at=(
                time_str_to_utc(updated_at_str) if updated_at_str is not None else None
            ),
            metadata={"type": "page"},
        )

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.bookstack_client is None:
            raise ConnectorMissingCredentialError("Bookstack")

        return self.poll_source(None, None)

    def poll_source(
        self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        if self.bookstack_client is None:
            raise ConnectorMissingCredentialError("Bookstack")

        transform_by_endpoint: dict[
            str, Callable[[BookStackApiClient, dict], Document]
        ] = {
            "/books": self._book_to_document,
            "/chapters": self._chapter_to_document,
            "/shelves": self._shelf_to_document,
            "/pages": self._page_to_document,
        }

        for endpoint, transform in transform_by_endpoint.items():
            start_ind = 0
            while True:
                doc_batch, num_results = self._get_doc_batch(
                    batch_size=self.batch_size,
                    bookstack_client=self.bookstack_client,
                    endpoint=endpoint,
                    transformer=transform,
                    start_ind=start_ind,
                    start=start,
                    end=end,
                )
                start_ind += num_results
                if doc_batch:
                    yield doc_batch

                if num_results < self.batch_size:
                    break
                else:
                    time.sleep(0.2)
