from collections.abc import Generator
from typing import Any
from urllib.parse import urlparse

from atlassian import Confluence  # type:ignore
from bs4 import BeautifulSoup
from danswer.configs.app_configs import CONFLUENCE_ACCESS_TOKEN
from danswer.configs.app_configs import CONFLUENCE_USERNAME
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import HTML_SEPARATOR
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section

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


class ConfluenceConnector(LoadConnector):
    def __init__(
        self,
        wiki_page_url: str,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size
        self.wiki_base, self.space = extract_confluence_keys_from_url(wiki_page_url)
        self.confluence_client = Confluence(
            url=self.wiki_base,
            username=CONFLUENCE_USERNAME,
            password=CONFLUENCE_ACCESS_TOKEN,
            cloud=True,
        )

    def load_credentials(self, credentials: dict[str, Any]) -> None:
        # TODO move global CONFLUENCE_USERNAME and CONFLUENCE_ACCESS_TOKEN and client init here
        pass

    def _comment_dfs(
        self, comments_str: str, comment_pages: Generator[dict[str, Any], None, None]
    ) -> str:
        for comment_page in comment_pages:
            comment_html = comment_page["body"]["storage"]["value"]
            soup = BeautifulSoup(comment_html, "html.parser")
            comments_str += "\nComment:\n" + soup.get_text(HTML_SEPARATOR)
            child_comment_pages = self.confluence_client.get_page_child_by_type(
                comment_page["id"],
                type="comment",
                start=None,
                limit=None,
                expand="body.storage.value",
            )
            comments_str = self._comment_dfs(comments_str, child_comment_pages)
        return comments_str

    def load_from_state(self) -> Generator[list[Document], None, None]:
        start_ind = 0
        while True:
            doc_batch: list[Document] = []

            batch = self.confluence_client.get_all_pages_from_space(
                self.space,
                start=start_ind,
                limit=self.batch_size,
                expand="body.storage.value",
            )

            for page in batch:
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
                comments_text = self._comment_dfs("", comment_pages)
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
            yield doc_batch

            start_ind += len(batch)
            if len(batch) < self.batch_size:
                break
        if doc_batch:
            yield doc_batch
