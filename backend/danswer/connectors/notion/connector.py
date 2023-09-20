import time
from collections.abc import Generator
from dataclasses import dataclass
from dataclasses import fields
from typing import Any
from typing import Optional

import requests
from retry import retry

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.app_configs import NOTION_CONNECTOR_ENABLE_RECURSIVE_PAGE_LOOKUP
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.batching import batch_generator
from danswer.utils.logger import setup_logger

logger = setup_logger()


@dataclass
class NotionPage:
    """Represents a Notion Page object"""

    id: str
    created_time: str
    last_edited_time: str
    archived: bool
    properties: dict[str, Any]
    url: str

    def __init__(self, **kwargs: dict[str, Any]) -> None:
        names = set([f.name for f in fields(self)])
        for k, v in kwargs.items():
            if k in names:
                setattr(self, k, v)


@dataclass
class NotionSearchResponse:
    """Represents the response from the Notion Search API"""

    results: list[dict[str, Any]]
    next_cursor: Optional[str]
    has_more: bool = False

    def __init__(self, **kwargs: dict[str, Any]) -> None:
        names = set([f.name for f in fields(self)])
        for k, v in kwargs.items():
            if k in names:
                setattr(self, k, v)


# TODO - Add the ability to optionally limit to specific Notion databases
class NotionConnector(LoadConnector, PollConnector):
    """Notion Page connector that reads all Notion pages
    this integration has been granted access to.

    Arguments:
        batch_size (int): Number of objects to index in a batch
    """

    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        recursive_index_enabled: bool = NOTION_CONNECTOR_ENABLE_RECURSIVE_PAGE_LOOKUP,
    ) -> None:
        """Initialize with parameters."""
        self.batch_size = batch_size
        self.headers = {
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        }
        self.indexed_pages: set[str] = set()
        # if enabled, will recursively index child pages as they are found rather
        # relying entirely on the `search` API. We have recieved reports that the
        # `search` API misses many pages - in those cases, this might need to be
        # turned on. It's not currently known why/when this is required.
        # NOTE: this also removes all benefits polling, since we need to traverse
        # all pages regardless of if they are updated. If the notion workspace is
        # very large, this may not be practical.
        self.recursive_index_enabled = recursive_index_enabled

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_blocks(self, block_id: str, cursor: str | None = None) -> dict[str, Any]:
        """Fetch all child blocks via the Notion API."""
        logger.debug(f"Fetching children of block with ID '{block_id}'")
        block_url = f"https://api.notion.com/v1/blocks/{block_id}/children"
        query_params = None if not cursor else {"start_cursor": cursor}
        res = requests.get(block_url, headers=self.headers, params=query_params)
        try:
            res.raise_for_status()
        except Exception as e:
            logger.exception(f"Error fetching blocks - {res.json()}")
            raise e
        return res.json()

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_page(self, page_id: str) -> NotionPage:
        """Fetch a page from it's ID via the Notion API."""
        logger.debug(f"Fetching page for ID '{page_id}'")
        block_url = f"https://api.notion.com/v1/pages/{page_id}"
        res = requests.get(block_url, headers=self.headers)
        try:
            res.raise_for_status()
        except Exception as e:
            logger.exception(f"Error fetching page - {res.json()}")
            raise e
        return NotionPage(**res.json())

    def _read_blocks(
        self, page_block_id: str
    ) -> tuple[list[tuple[str, str]], list[str]]:
        """Reads blocks for a page"""
        result_lines: list[tuple[str, str]] = []
        child_pages: list[str] = []
        cursor = None
        while True:
            data = self._fetch_blocks(page_block_id, cursor)

            for result in data["results"]:
                result_block_id = result["id"]
                result_type = result["type"]
                result_obj = result[result_type]

                cur_result_text_arr = []
                if "rich_text" in result_obj:
                    for rich_text in result_obj["rich_text"]:
                        # skip if doesn't have text object
                        if "text" in rich_text:
                            text = rich_text["text"]["content"]
                            cur_result_text_arr.append(text)

                if result["has_children"] and result_type == "child_page":
                    child_pages.append(result_block_id)

                cur_result_text = "\n".join(cur_result_text_arr)
                if cur_result_text:
                    result_lines.append((cur_result_text, result_block_id))

            if data["next_cursor"] is None:
                break

            cursor = data["next_cursor"]

        return result_lines, child_pages

    def _read_page_title(self, page: NotionPage) -> str:
        """Extracts the title from a Notion page"""
        page_title = None
        for _, prop in page.properties.items():
            if prop["type"] == "title" and len(prop["title"]) > 0:
                page_title = " ".join([t["plain_text"] for t in prop["title"]]).strip()
                break
        if page_title is None:
            page_title = f"Untitled Page [{page.id}]"
        return page_title

    def _read_pages(
        self,
        pages: list[NotionPage],
    ) -> Generator[Document, None, None]:
        """Reads pages for rich text content and generates Documents"""
        all_child_page_ids: list[str] = []
        for page in pages:
            if page.id in self.indexed_pages:
                logger.debug(f"Already indexed page with ID '{page.id}'. Skipping.")
                continue

            logger.info(f"Reading page with ID '{page.id}', with url {page.url}")
            page_blocks, child_page_ids = self._read_blocks(page.id)
            all_child_page_ids.extend(child_page_ids)
            page_title = self._read_page_title(page)
            yield (
                Document(
                    id=page.id,
                    sections=[Section(link=page.url, text=f"{page_title}\n")]
                    + [
                        Section(
                            link=f"{page.url}#{block_id.replace('-', '')}",
                            text=block_text,
                        )
                        for block_text, block_id in page_blocks
                    ],
                    source=DocumentSource.NOTION,
                    semantic_identifier=page_title,
                    metadata={},
                )
            )
            self.indexed_pages.add(page.id)

        if self.recursive_index_enabled and all_child_page_ids:
            # NOTE: checking if page_id is in self.indexed_pages to prevent extra
            # calls to `_fetch_page` for pages we've already indexed
            all_child_pages = [
                self._fetch_page(page_id)
                for page_id in all_child_page_ids
                if page_id not in self.indexed_pages
            ]
            yield from self._read_pages(all_child_pages)

    @retry(tries=3, delay=1, backoff=2)
    def _search_notion(self, query_dict: dict[str, Any]) -> NotionSearchResponse:
        """Search for pages from a Notion database. Includes some small number of
        retries to handle misc, flakey failures."""
        logger.debug(f"Searching for pages in Notion with query_dict: {query_dict}")
        res = requests.post(
            "https://api.notion.com/v1/search",
            headers=self.headers,
            json=query_dict,
        )
        res.raise_for_status()
        return NotionSearchResponse(**res.json())

    def _filter_pages_by_time(
        self,
        pages: list[dict[str, Any]],
        start: SecondsSinceUnixEpoch,
        end: SecondsSinceUnixEpoch,
        filter_field: str = "last_edited_time",
    ) -> list[NotionPage]:
        """A helper function to filter out pages outside of a time
        range. This functionality doesn't yet exist in the Notion Search API,
        but when it does, this approach can be deprecated.

        Arguments:
            pages (list[dict]) - Pages to filter
            start (float) - start epoch time to filter from
            end (float) - end epoch time to filter to
            filter_field (str) - the attribute on the page to apply the filter
        """
        filtered_pages: list[NotionPage] = []
        for page in pages:
            compare_time = time.mktime(
                time.strptime(page[filter_field], "%Y-%m-%dT%H:%M:%S.000Z")
            )
            if compare_time <= end or compare_time > start:
                filtered_pages += [NotionPage(**page)]
        return filtered_pages

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        """Applies integration token to headers"""
        self.headers[
            "Authorization"
        ] = f'Bearer {credentials["notion_integration_token"]}'
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        """Loads all page data from a Notion workspace.

        Returns:
            list[Document]: list of documents.
        """
        query_dict = {
            "filter": {"property": "object", "value": "page"},
            "page_size": self.batch_size,
        }
        while True:
            db_res = self._search_notion(query_dict)
            pages = [NotionPage(**page) for page in db_res.results]
            yield from batch_generator(self._read_pages(pages), self.batch_size)
            if db_res.has_more:
                query_dict["start_cursor"] = db_res.next_cursor
            else:
                break

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        """Uses the Notion search API to fetch updated pages
        within a time period.
        Unfortunately the search API doesn't yet support filtering by times,
        so until they add that, we're just going to page through results until,
        we reach ones that are older than our search criteria.
        """
        query_dict = {
            "page_size": self.batch_size,
            "sort": {"timestamp": "last_edited_time", "direction": "descending"},
            "filter": {"property": "object", "value": "page"},
        }
        while True:
            db_res = self._search_notion(query_dict)
            pages = self._filter_pages_by_time(
                db_res.results, start, end, filter_field="last_edited_time"
            )
            if len(pages) > 0:
                yield from batch_generator(self._read_pages(pages), self.batch_size)
            if db_res.has_more:
                query_dict["start_cursor"] = db_res.next_cursor
            else:
                break


if __name__ == "__main__":
    import os

    connector = NotionConnector()
    connector.load_credentials(
        {"notion_integration_token": os.environ.get("NOTION_INTEGRATION_TOKEN")}
    )
    document_batches = connector.load_from_state()
    batch = next(document_batches)
    for doc in batch:
        print(doc)
