import html
import time
from collections.abc import Callable
from datetime import datetime
from typing import Any

from bs4 import BeautifulSoup
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import HTML_SEPARATOR
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.bookstack.client import BookStackApiClient
from danswer.connectors.models import Document
from danswer.connectors.models import Section


class BookstackClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__(
            "BookStack Client is not set up, was load_credentials called?"
        )


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

    def _get_doc_batch(
        self,
        endpoint: str,
        transformer: Callable[[dict], Document],
        start_ind: int,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> tuple[list[Document], int]:
        doc_batch: list[Document] = []

        params = {
            "count": str(self.batch_size),
            "offset": str(start_ind),
            "sort": "+id"
        }

        if start:
            params["filter[updated_at:gte]"] = datetime.utcfromtimestamp(start).strftime('%Y-%m-%d %H:%M:%S')

        if end:
            params["filter[updated_at:lte]"] = datetime.utcfromtimestamp(end).strftime('%Y-%m-%d %H:%M:%S')

        batch = self.bookstack_client.get(endpoint, params=params).get("data", [])
        for item in batch:
            doc_batch.append(transformer(item))

        return doc_batch, len(batch)

    def _book_to_document(self, book: dict):
        url = self.bookstack_client.build_app_url("/books/" + book.get("slug"))
        text = book.get("name", "") + "\n" + book.get("description", "")
        return Document(
            id="book:" + str(book.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Book: " + book.get("name"),
            metadata={
                "type": "book",
                "updated_at": book.get("updated_at")
            },
        )

    def _chapter_to_document(self, chapter: dict):
        url = self.bookstack_client.build_app_url("/books/" + chapter.get("book_slug") + "/chapter/" + chapter.get("slug"))
        text = chapter.get("name", "") + "\n" + chapter.get("description", "")
        return Document(
            id="chapter:" + str(chapter.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Chapter: " + chapter.get("name"),
            metadata={
                "type": "chapter",
                "updated_at": chapter.get("updated_at")
            },
        )

    def _shelf_to_document(self, shelf: dict):
        url = self.bookstack_client.build_app_url("/shelves/" + shelf.get("slug"))
        text = shelf.get("name", "") + "\n" + shelf.get("description", "")
        return Document(
            id="shelf:" + str(shelf.get("id")),
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Shelf: " + shelf.get("name"),
            metadata={
                "type": "shelf",
                "updated_at": shelf.get("updated_at")
            },
        )

    def _page_to_document(self, page: dict):
        page_id = str(page.get("id"))
        page_data = self.bookstack_client.get("/pages/" + page_id, {})
        url = self.bookstack_client.build_app_url("/books/" + page.get("book_slug") + "/page/" + page_data.get("slug"))
        page_html = "<h1>" + html.escape(page_data.get("name")) + "</h1>" + page_data.get("html")
        soup = BeautifulSoup(page_html, "html.parser")
        text = soup.get_text(HTML_SEPARATOR)
        time.sleep(0.1)
        return Document(
            id="page:" + page_id,
            sections=[Section(link=url, text=text)],
            source=DocumentSource.BOOKSTACK,
            semantic_identifier="Page: " + page_data.get("name"),
            metadata={
                "type": "page",
                "updated_at": page_data.get("updated_at")
            },
        )

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.bookstack_client is None:
            raise BookstackClientNotSetUpError()

        return self.poll_source(None, None)

    def poll_source(
        self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        if self.bookstack_client is None:
            raise BookstackClientNotSetUpError()

        transform_by_endpoint: dict[str, Callable[[dict], Document]] = {
            "/books": self._book_to_document,
            "/chapters": self._chapter_to_document,
            "/shelves": self._shelf_to_document,
            "/pages": self._page_to_document,
        }

        for endpoint, transform in transform_by_endpoint.items():
            start_ind = 0
            while True:
                doc_batch, num_results = self._get_doc_batch(endpoint, transform, start_ind, start, end)
                start_ind += num_results
                if doc_batch:
                    yield doc_batch

                if num_results < self.batch_size:
                    break
                else:
                    time.sleep(0.2)
