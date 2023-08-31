import os
from collections.abc import Callable
from collections.abc import Collection
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import cast
from urllib.parse import urlparse

from atlassian import Confluence  # type:ignore
from requests import HTTPError

from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import parse_html_page_basic

logger = setup_logger()

# Potential Improvements
# 1. If wiki page instead of space, do a search of all the children of the page instead of index all in the space
# 2. Include attachments, etc
# 3. Segment into Sections for more accurate linking, can split by headers but make sure no text/ordering is lost


def extract_confluence_keys_from_url(wiki_url: str) -> tuple[str, str]:
    """Sample
    https://danswer.atlassian.net/wiki/spaces/1234abcd/overview
    wiki_base is danswer.atlassian.net/wiki
    space is 1234abcd
    """
    if ".atlassian.net/wiki/spaces/" not in wiki_url:
        raise ValueError(
            "Not a valid Confluence Wiki Link, unable to extract wiki base and space names"
        )

    parsed_url = urlparse(wiki_url)
    wiki_base = (
        parsed_url.scheme
        + "://"
        + parsed_url.netloc
        + parsed_url.path.split("/spaces")[0]
    )
    space = parsed_url.path.split("/")[3]
    return wiki_base, space


def _comment_dfs(
    comments_str: str,
    comment_pages: Collection[dict[str, Any]],
    confluence_client: Confluence,
) -> str:
    for comment_page in comment_pages:
        comment_html = comment_page["body"]["storage"]["value"]
        comments_str += "\nComment:\n" + parse_html_page_basic(comment_html)
        child_comment_pages = confluence_client.get_page_child_by_type(
            comment_page["id"],
            type="comment",
            start=None,
            limit=None,
            expand="body.storage.value",
        )
        comments_str = _comment_dfs(
            comments_str, child_comment_pages, confluence_client
        )
    return comments_str


class ConfluenceConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        wiki_page_url: str,
        batch_size: int = INDEX_BATCH_SIZE,
        continue_on_failure: bool = CONTINUE_ON_CONNECTOR_FAILURE,
    ) -> None:
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure
        self.wiki_base, self.space = extract_confluence_keys_from_url(wiki_page_url)
        self.confluence_client: Confluence | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        username = credentials["confluence_username"]
        access_token = credentials["confluence_access_token"]
        self.confluence_client = Confluence(
            url=self.wiki_base,
            username=username,
            password=access_token,
            cloud=True,
        )
        return None

    def _fetch_pages(
        self,
        confluence_client: Confluence,
        start_ind: int,
    ) -> Collection[dict[str, Any]]:
        def _fetch(start_ind: int, batch_size: int) -> Collection[dict[str, Any]]:
            try:
                return confluence_client.get_all_pages_from_space(
                    self.space,
                    start=start_ind,
                    limit=batch_size,
                    expand="body.storage.value,version",
                )
            except Exception:
                logger.warning(
                    f"Batch failed with space {self.space} at offset {start_ind} "
                    f"with size {batch_size}, processing pages individually..."
                )

                view_pages: list[dict[str, Any]] = []
                for i in range(self.batch_size):
                    try:
                        # Could be that one of the pages here failed due to this bug:
                        # https://jira.atlassian.com/browse/CONFCLOUD-76433
                        view_pages.extend(
                            confluence_client.get_all_pages_from_space(
                                self.space,
                                start=start_ind + i,
                                limit=1,
                                expand="body.storage.value,version",
                            )
                        )
                    except HTTPError as e:
                        logger.warning(
                            f"Page failed with space {self.space} at offset {start_ind + i}, "
                            f"trying alternative expand option: {e}"
                        )
                        # Use view instead, which captures most info but is less complete
                        view_pages.extend(
                            confluence_client.get_all_pages_from_space(
                                self.space,
                                start=start_ind + i,
                                limit=1,
                                expand="body.view.value,version",
                            )
                        )

                return view_pages

        try:
            return _fetch(start_ind, self.batch_size)
        except Exception as e:
            if not self.continue_on_failure:
                raise e

        # error checking phase, only reachable if `self.continue_on_failure=True`
        pages: list[dict[str, Any]] = []
        for i in range(self.batch_size):
            try:
                pages.extend(_fetch(start_ind + i, 1))
            except Exception:
                logger.exception(
                    "Ran into exception when fetching pages from Confluence"
                )

        return pages

    def _fetch_comments(self, confluence_client: Confluence, page_id: str) -> str:
        try:
            comment_pages = cast(
                Collection[dict[str, Any]],
                confluence_client.get_page_child_by_type(
                    page_id,
                    type="comment",
                    start=None,
                    limit=None,
                    expand="body.storage.value",
                ),
            )
            return _comment_dfs("", comment_pages, confluence_client)
        except Exception as e:
            if not self.continue_on_failure:
                raise e

            logger.exception(
                "Ran into exception when fetching comments from Confluence"
            )
            return ""

    def _get_doc_batch(
        self, start_ind: int, time_filter: Callable[[datetime], bool] | None = None
    ) -> tuple[list[Document], int]:
        doc_batch: list[Document] = []

        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        batch = self._fetch_pages(self.confluence_client, start_ind)
        for page in batch:
            last_modified_str = page["version"]["when"]
            last_modified = datetime.fromisoformat(last_modified_str)

            if time_filter is None or time_filter(last_modified):
                page_html = (
                    page["body"]
                    .get("storage", page["body"].get("view", {}))
                    .get("value")
                )
                page_url = self.wiki_base + page["_links"]["webui"]
                if not page_html:
                    logger.debug("Page is empty, skipping: %s", page_url)
                    continue
                page_text = (
                    page.get("title", "") + "\n" + parse_html_page_basic(page_html)
                )
                comments_text = self._fetch_comments(self.confluence_client, page["id"])
                page_text += comments_text

                doc_batch.append(
                    Document(
                        id=page_url,
                        sections=[Section(link=page_url, text=page_text)],
                        source=DocumentSource.CONFLUENCE,
                        semantic_identifier=page["title"],
                        metadata={
                            "Wiki Space Name": self.space,
                            "Updated At": page["version"]["friendlyWhen"],
                        },
                    )
                )
        return doc_batch, len(batch)

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

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
            raise ConnectorMissingCredentialError("Confluence")

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


if __name__ == "__main__":
    connector = ConfluenceConnector(os.environ["CONFLUENCE_TEST_SPACE_URL"])
    connector.load_credentials(
        {
            "confluence_username": os.environ["CONFLUENCE_USER_NAME"],
            "confluence_access_token": os.environ["CONFLUENCE_ACCESS_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
