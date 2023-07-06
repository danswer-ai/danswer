from collections.abc import Callable
from collections.abc import Generator
from datetime import datetime
from datetime import timezone
from typing import Any
from urllib.parse import urlparse

from atlassian import Confluence  # type:ignore
from bs4 import BeautifulSoup
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import HTML_SEPARATOR
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section

class BookstackClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__(
            "Confluence Client is not set up, was load_credentials called?"
        )

class BookstackConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        base_url = credentials["bookstack_base_url"]
        api_token_id = credentials["bookstack_api_token_id"]
        api_token_secret = credentials["bookstack_api_token_secret"]
        return None

    def _get_doc_batch(
        self, start_ind: int, time_filter: Callable[[datetime], bool] | None = None
    ) -> tuple[list[Document], int]:
        doc_batch: list[Document] = []

        if self.confluence_client is None:
            raise BookstackClientNotSetUpError()

        batch = self.confluence_client.get_all_pages_from_space(
            self.space,
            start=start_ind,
            limit=self.batch_size,
            expand="body.storage.value,version",
        )

        for page in batch:
            last_modified_str = page["version"]["when"]
            last_modified = datetime.fromisoformat(last_modified_str)

            if time_filter is None or time_filter(last_modified):
                page_html = page["body"]["storage"]["value"]
                soup = BeautifulSoup(page_html, "html.parser")
                page_text = page.get("title", "") + "\n" + soup.get_text(HTML_SEPARATOR)
                comment_pages = self.confluence_client.get_page_child_by_type(
                    page["id"],
                    type="comment",
                    start=None,
                    limit=None,
                    expand="body.storage.value",
                )
                comments_text = _comment_dfs("", comment_pages, self.confluence_client)
                page_text += comments_text

                page_url = self.wiki_base + page["_links"]["webui"]

                doc_batch.append(
                    Document(
                        id=page_url,
                        sections=[Section(link=page_url, text=page_text)],
                        source=DocumentSource.CONFLUENCE,
                        semantic_identifier=page["title"],
                        metadata={},
                    )
                )
        return doc_batch, len(batch)

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.confluence_client is None:
            raise BookstackClientNotSetUpError()

        start_ind = 0
        while True:
            doc_batch, num_pages = self._get_doc_batch(start_ind)
            start_ind += num_pages
            if doc_batch:
                yield doc_batch

            if num_pages < self.batch_size:
                break

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.confluence_client is None:
            raise BookstackClientNotSetUpError()

        start_time = datetime.fromtimestamp(start, tz=timezone.utc)
        end_time = datetime.fromtimestamp(end, tz=timezone.utc)

        start_ind = 0
        while True:
            doc_batch, num_pages = self._get_doc_batch(
                start_ind, time_filter=lambda t: start_time <= t <= end_time
            )
            start_ind += num_pages
            if doc_batch:
                yield doc_batch

            if num_pages < self.batch_size:
                break
