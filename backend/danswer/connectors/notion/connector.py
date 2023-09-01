import time
from dataclasses import dataclass
from dataclasses import fields
from typing import Any
from typing import Dict
from typing import List
from typing import Optional

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section


@dataclass
class NotionPage:
    """Represents a Notion Page object"""

    id: str
    created_time: str
    last_edited_time: str
    archived: bool
    properties: Dict[str, Any]
    url: str

    def __init__(self, **kwargs: dict[str, Any]) -> None:
        names = set([f.name for f in fields(self)])
        for k, v in kwargs.items():
            if k in names:
                setattr(self, k, v)


@dataclass
class NotionSearchResponse:
    """Represents the response from the Notion Search API"""

    results: List[Dict[str, Any]]
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

    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        """Initialize with parameters."""
        self.batch_size = batch_size
        self.headers = {
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        }

    def _read_blocks(self, block_id: str, num_tabs: int = 0) -> str:
        """Reads blocks for a page"""
        done = False
        result_lines_arr = []
        cur_block_id = block_id
        while not done:
            block_url = f"https://api.notion.com/v1/blocks/{cur_block_id}/children"
            query_dict: Dict[str, Any] = {}

            res = requests.request(
                "GET", block_url, headers=self.headers, json=query_dict
            )
            data = res.json()

            for result in data["results"]:
                result_type = result["type"]
                result_obj = result[result_type]

                cur_result_text_arr = []
                if "rich_text" in result_obj:
                    for rich_text in result_obj["rich_text"]:
                        # skip if doesn't have text object
                        if "text" in rich_text:
                            text = rich_text["text"]["content"]
                            prefix = "\t" * num_tabs
                            cur_result_text_arr.append(prefix + text)

                result_block_id = result["id"]
                has_children = result["has_children"]
                if has_children:
                    children_text = self._read_blocks(
                        result_block_id, num_tabs=num_tabs + 1
                    )
                    cur_result_text_arr.append(children_text)

                cur_result_text = "\n".join(cur_result_text_arr)
                result_lines_arr.append(cur_result_text)

            if data["next_cursor"] is None:
                done = True
                break
            else:
                cur_block_id = data["next_cursor"]

        result_lines = "\n".join(result_lines_arr)
        return result_lines

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

    def _read_pages(self, pages: List[NotionPage]) -> List[Document]:
        """Reads pages for rich text content and generates Documents"""
        docs_batch = []
        for page in pages:
            page_text = self._read_blocks(page.id)
            page_title = self._read_page_title(page)
            docs_batch.append(
                Document(
                    id=page.id,
                    sections=[Section(link=page.url, text=page_text)],
                    source=DocumentSource.NOTION,
                    semantic_identifier=page_title,
                    metadata={},
                )
            )
        return docs_batch

    def _search_notion(self, query_dict: Dict[str, Any]) -> NotionSearchResponse:
        """Search for pages from a Notion database."""
        res = requests.post(
            "https://api.notion.com/v1/search",
            headers=self.headers,
            json=query_dict,
        )
        res.raise_for_status()
        return NotionSearchResponse(**res.json())

    def _filter_pages_by_time(
        self,
        pages: List[Dict[str, Any]],
        start: SecondsSinceUnixEpoch,
        end: SecondsSinceUnixEpoch,
        filter_field: str = "last_edited_time",
    ) -> List[NotionPage]:
        """A helper function to filter out pages outside of a time
        range. This functionality doesn't yet exist in the Notion Search API,
        but when it does, this approach can be deprecated.

        Arguments:
            pages (List[Dict]) - Pages to filter
            start (float) - start epoch time to filter from
            end (float) - end epoch time to filter to
            filter_field (str) - the attribute on the page to apply the filter
        """
        filtered_pages = []
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
            List[Document]: List of documents.
        """
        query_dict = {
            "filter": {"property": "object", "value": "page"},
            "page_size": self.batch_size,
        }
        while True:
            db_res = self._search_notion(query_dict)
            pages = [NotionPage(**page) for page in db_res.results]
            yield self._read_pages(pages)
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
                yield self._read_pages(pages)
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
    print(next(document_batches))
