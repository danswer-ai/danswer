import time
from collections.abc import Generator
from dataclasses import dataclass
from dataclasses import fields
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import Optional

from retry import retry

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.app_configs import NOTION_CONNECTOR_ENABLE_RECURSIVE_PAGE_LOOKUP
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.rate_limit_wrapper import (
    rl_requests,
)
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.batching import batch_generator
from danswer.utils.logger import setup_logger

logger = setup_logger()

_NOTION_CALL_TIMEOUT = 30  # 30 seconds


# TODO: Tables need to be ingested, Pages need to have their metadata ingested


@dataclass
class NotionPage:
    """Represents a Notion Page object"""

    id: str
    created_time: str
    last_edited_time: str
    archived: bool
    properties: dict[str, Any]
    url: str

    database_name: str | None  # Only applicable to the database type page (wiki)

    def __init__(self, **kwargs: dict[str, Any]) -> None:
        names = set([f.name for f in fields(self)])
        for k, v in kwargs.items():
            if k in names:
                setattr(self, k, v)


@dataclass
class NotionBlock:
    """Represents a Notion Block object"""

    id: str  # Used for the URL
    text: str
    # In a plaintext representation of the page, how this block should be joined
    # with the existing text up to this point, separated out from text for clarity
    prefix: str


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
        root_page_id: str | None = None,
    ) -> None:
        """Initialize with parameters."""
        self.batch_size = batch_size
        self.headers = {
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        }
        self.indexed_pages: set[str] = set()
        self.root_page_id = root_page_id
        # if enabled, will recursively index child pages as they are found rather
        # relying entirely on the `search` API. We have received reports that the
        # `search` API misses many pages - in those cases, this might need to be
        # turned on. It's not currently known why/when this is required.
        # NOTE: this also removes all benefits polling, since we need to traverse
        # all pages regardless of if they are updated. If the notion workspace is
        # very large, this may not be practical.
        self.recursive_index_enabled = recursive_index_enabled or self.root_page_id

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_child_blocks(
        self, block_id: str, cursor: str | None = None
    ) -> dict[str, Any] | None:
        """Fetch all child blocks via the Notion API."""
        logger.debug(f"Fetching children of block with ID '{block_id}'")
        block_url = f"https://api.notion.com/v1/blocks/{block_id}/children"
        query_params = None if not cursor else {"start_cursor": cursor}
        res = rl_requests.get(
            block_url,
            headers=self.headers,
            params=query_params,
            timeout=_NOTION_CALL_TIMEOUT,
        )
        try:
            res.raise_for_status()
        except Exception as e:
            if res.status_code == 404:
                # this happens when a page is not shared with the integration
                # in this case, we should just ignore the page
                logger.error(
                    f"Unable to access block with ID '{block_id}'. "
                    f"This is likely due to the block not being shared "
                    f"with the Danswer integration. Exact exception:\n\n{e}"
                )
            else:
                logger.exception(
                    f"Error fetching blocks with status code {res.status_code}: {res.json()}"
                )

            # This can occasionally happen, the reason is unknown and cannot be reproduced on our internal Notion
            # Assuming this will not be a critical loss of data
            return None
        return res.json()

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_page(self, page_id: str) -> NotionPage:
        """Fetch a page from its ID via the Notion API, retry with database if page fetch fails."""
        logger.debug(f"Fetching page for ID '{page_id}'")
        page_url = f"https://api.notion.com/v1/pages/{page_id}"
        res = rl_requests.get(
            page_url,
            headers=self.headers,
            timeout=_NOTION_CALL_TIMEOUT,
        )
        try:
            res.raise_for_status()
        except Exception as e:
            logger.warning(
                f"Failed to fetch page, trying database for ID '{page_id}'. Exception: {e}"
            )
            # Try fetching as a database if page fetch fails, this happens if the page is set to a wiki
            # it becomes a database from the notion perspective
            return self._fetch_database_as_page(page_id)
        return NotionPage(**res.json())

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_database_as_page(self, database_id: str) -> NotionPage:
        """Attempt to fetch a database as a page."""
        logger.debug(f"Fetching database for ID '{database_id}' as a page")
        database_url = f"https://api.notion.com/v1/databases/{database_id}"
        res = rl_requests.get(
            database_url,
            headers=self.headers,
            timeout=_NOTION_CALL_TIMEOUT,
        )
        try:
            res.raise_for_status()
        except Exception as e:
            logger.exception(f"Error fetching database as page - {res.json()}")
            raise e
        database_name = res.json().get("title")
        database_name = (
            database_name[0].get("text", {}).get("content") if database_name else None
        )

        return NotionPage(**res.json(), database_name=database_name)

    @retry(tries=3, delay=1, backoff=2)
    def _fetch_database(
        self, database_id: str, cursor: str | None = None
    ) -> dict[str, Any]:
        """Fetch a database from it's ID via the Notion API."""
        logger.debug(f"Fetching database for ID '{database_id}'")
        block_url = f"https://api.notion.com/v1/databases/{database_id}/query"
        body = None if not cursor else {"start_cursor": cursor}
        res = rl_requests.post(
            block_url,
            headers=self.headers,
            json=body,
            timeout=_NOTION_CALL_TIMEOUT,
        )
        try:
            res.raise_for_status()
        except Exception as e:
            if res.json().get("code") == "object_not_found":
                # this happens when a database is not shared with the integration
                # in this case, we should just ignore the database
                logger.error(
                    f"Unable to access database with ID '{database_id}'. "
                    f"This is likely due to the database not being shared "
                    f"with the Danswer integration. Exact exception:\n{e}"
                )
                return {"results": [], "next_cursor": None}
            logger.exception(f"Error fetching database - {res.json()}")
            raise e
        return res.json()

    @staticmethod
    def _properties_to_str(properties: dict[str, Any]) -> str:
        """Converts Notion properties to a string"""

        def _recurse_properties(inner_dict: dict[str, Any]) -> str | None:
            while "type" in inner_dict:
                type_name = inner_dict["type"]
                inner_dict = inner_dict[type_name]

                # If the innermost layer is None, the value is not set
                if not inner_dict:
                    return None

                if isinstance(inner_dict, list):
                    list_properties = [
                        _recurse_properties(item) for item in inner_dict if item
                    ]
                    return (
                        ", ".join(
                            [
                                list_property
                                for list_property in list_properties
                                if list_property
                            ]
                        )
                        or None
                    )

            # TODO there may be more types to handle here
            if isinstance(inner_dict, str):
                # For some objects the innermost value could just be a string, not sure what causes this
                return inner_dict

            elif isinstance(inner_dict, dict):
                if "name" in inner_dict:
                    return inner_dict["name"]
                if "content" in inner_dict:
                    return inner_dict["content"]
                start = inner_dict.get("start")
                end = inner_dict.get("end")
                if start is not None:
                    if end is not None:
                        return f"{start} - {end}"
                    return start
                elif end is not None:
                    return f"Until {end}"

                if "id" in inner_dict:
                    # This is not useful to index, it's a reference to another Notion object
                    # and this ID value in plaintext is useless outside of the Notion context
                    logger.debug("Skipping Notion object id field property")
                    return None

            logger.debug(f"Unreadable property from innermost prop: {inner_dict}")
            return None

        result = ""
        for prop_name, prop in properties.items():
            if not prop:
                continue

            try:
                inner_value = _recurse_properties(prop)
            except Exception as e:
                # This is not a critical failure, these properties are not the actual contents of the page
                # more similar to metadata
                logger.warning(f"Error recursing properties for {prop_name}: {e}")
                continue
            # Not a perfect way to format Notion database tables but there's no perfect representation
            # since this must be represented as plaintext
            if inner_value:
                result += f"{prop_name}: {inner_value}\t"

        return result

    def _read_pages_from_database(
        self, database_id: str
    ) -> tuple[list[NotionBlock], list[str]]:
        """Returns a list of top level blocks and all page IDs in the database"""
        result_blocks: list[NotionBlock] = []
        result_pages: list[str] = []
        cursor = None
        while True:
            data = self._fetch_database(database_id, cursor)

            for result in data["results"]:
                obj_id = result["id"]
                obj_type = result["object"]
                text = self._properties_to_str(result.get("properties", {}))
                if text:
                    result_blocks.append(NotionBlock(id=obj_id, text=text, prefix="\n"))

                if self.recursive_index_enabled:
                    if obj_type == "page":
                        logger.debug(
                            f"Found page with ID '{obj_id}' in database '{database_id}'"
                        )
                        result_pages.append(result["id"])
                    elif obj_type == "database":
                        logger.debug(
                            f"Found database with ID '{obj_id}' in database '{database_id}'"
                        )
                        # The inner contents are ignored at this level
                        _, child_pages = self._read_pages_from_database(obj_id)
                        result_pages.extend(child_pages)

            if data["next_cursor"] is None:
                break

            cursor = data["next_cursor"]

        return result_blocks, result_pages

    def _read_blocks(self, base_block_id: str) -> tuple[list[NotionBlock], list[str]]:
        """Reads all child blocks for the specified block, returns a list of blocks and child page ids"""
        result_blocks: list[NotionBlock] = []
        child_pages: list[str] = []
        cursor = None
        while True:
            data = self._fetch_child_blocks(base_block_id, cursor)

            # this happens when a block is not shared with the integration
            if data is None:
                return result_blocks, child_pages

            for result in data["results"]:
                logger.debug(
                    f"Found child block for block with ID '{base_block_id}': {result}"
                )
                result_block_id = result["id"]
                result_type = result["type"]
                result_obj = result[result_type]

                if result_type == "ai_block":
                    logger.warning(
                        f"Skipping 'ai_block' ('{result_block_id}') for base block '{base_block_id}': "
                        f"Notion API does not currently support reading AI blocks (as of 24/02/09) "
                        f"(discussion: https://github.com/danswer-ai/danswer/issues/1053)"
                    )
                    continue

                if result_type == "unsupported":
                    logger.warning(
                        f"Skipping unsupported block type '{result_type}' "
                        f"('{result_block_id}') for base block '{base_block_id}': "
                        f"(discussion: https://github.com/danswer-ai/danswer/issues/1230)"
                    )
                    continue

                if result_type == "external_object_instance_page":
                    logger.warning(
                        f"Skipping 'external_object_instance_page' ('{result_block_id}') for base block '{base_block_id}': "
                        f"Notion API does not currently support reading external blocks (as of 24/07/03) "
                        f"(discussion: https://github.com/danswer-ai/danswer/issues/1761)"
                    )
                    continue

                cur_result_text_arr = []
                if "rich_text" in result_obj:
                    for rich_text in result_obj["rich_text"]:
                        # skip if doesn't have text object
                        if "text" in rich_text:
                            text = rich_text["text"]["content"]
                            cur_result_text_arr.append(text)

                if result["has_children"]:
                    if result_type == "child_page":
                        # Child pages will not be included at this top level, it will be a separate document
                        child_pages.append(result_block_id)
                    else:
                        logger.debug(f"Entering sub-block: {result_block_id}")
                        subblocks, subblock_child_pages = self._read_blocks(
                            result_block_id
                        )
                        logger.debug(f"Finished sub-block: {result_block_id}")
                        result_blocks.extend(subblocks)
                        child_pages.extend(subblock_child_pages)

                if result_type == "child_database":
                    inner_blocks, inner_child_pages = self._read_pages_from_database(
                        result_block_id
                    )
                    # A database on a page often looks like a table, we need to include it for the contents
                    # of the page but the children (cells) should be processed as other Documents
                    result_blocks.extend(inner_blocks)

                    if self.recursive_index_enabled:
                        child_pages.extend(inner_child_pages)

                if cur_result_text_arr:
                    new_block = NotionBlock(
                        id=result_block_id,
                        text="\n".join(cur_result_text_arr),
                        prefix="\n",
                    )
                    result_blocks.append(new_block)

            if data["next_cursor"] is None:
                break

            cursor = data["next_cursor"]

        return result_blocks, child_pages

    def _read_page_title(self, page: NotionPage) -> str | None:
        """Extracts the title from a Notion page"""
        page_title = None
        if hasattr(page, "database_name") and page.database_name:
            return page.database_name
        for _, prop in page.properties.items():
            if prop["type"] == "title" and len(prop["title"]) > 0:
                page_title = " ".join([t["plain_text"] for t in prop["title"]]).strip()
                break

        return page_title

    def _read_pages(
        self,
        pages: list[NotionPage],
    ) -> Generator[Document, None, None]:
        """Reads pages for rich text content and generates Documents

        Note that a page which is turned into a "wiki" becomes a database but both top level pages and top level databases
        do not seem to have any properties associated with them.

        Pages that are part of a database can have properties which are like the values of the row in the "database" table
        in which they exist

        This is not clearly outlined in the Notion API docs but it is observable empirically.
        https://developers.notion.com/docs/working-with-page-content
        """
        all_child_page_ids: list[str] = []
        for page in pages:
            if page.id in self.indexed_pages:
                logger.debug(f"Already indexed page with ID '{page.id}'. Skipping.")
                continue

            logger.info(f"Reading page with ID '{page.id}', with url {page.url}")
            page_blocks, child_page_ids = self._read_blocks(page.id)
            all_child_page_ids.extend(child_page_ids)

            if not page_blocks:
                continue

            page_title = (
                self._read_page_title(page) or f"Untitled Page with ID {page.id}"
            )

            yield (
                Document(
                    id=page.id,
                    sections=[
                        Section(
                            link=f"{page.url}#{block.id.replace('-', '')}",
                            text=block.prefix + block.text,
                        )
                        for block in page_blocks
                    ],
                    source=DocumentSource.NOTION,
                    semantic_identifier=page_title,
                    doc_updated_at=datetime.fromisoformat(
                        page.last_edited_time
                    ).astimezone(timezone.utc),
                    metadata={},
                )
            )
            self.indexed_pages.add(page.id)

        if self.recursive_index_enabled and all_child_page_ids:
            # NOTE: checking if page_id is in self.indexed_pages to prevent extra
            # calls to `_fetch_page` for pages we've already indexed
            for child_page_batch_ids in batch_generator(
                all_child_page_ids, batch_size=INDEX_BATCH_SIZE
            ):
                child_page_batch = [
                    self._fetch_page(page_id)
                    for page_id in child_page_batch_ids
                    if page_id not in self.indexed_pages
                ]
                yield from self._read_pages(child_page_batch)

    @retry(tries=3, delay=1, backoff=2)
    def _search_notion(self, query_dict: dict[str, Any]) -> NotionSearchResponse:
        """Search for pages from a Notion database. Includes some small number of
        retries to handle misc, flakey failures."""
        logger.debug(f"Searching for pages in Notion with query_dict: {query_dict}")
        res = rl_requests.post(
            "https://api.notion.com/v1/search",
            headers=self.headers,
            json=query_dict,
            timeout=_NOTION_CALL_TIMEOUT,
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
            if compare_time > start and compare_time <= end:
                filtered_pages += [NotionPage(**page)]
        return filtered_pages

    def _recursive_load(self) -> Generator[list[Document], None, None]:
        if self.root_page_id is None or not self.recursive_index_enabled:
            raise RuntimeError(
                "Recursive page lookup is not enabled, but we are trying to "
                "recursively load pages. This should never happen."
            )

        logger.info(
            "Recursively loading pages from Notion based on root page with "
            f"ID: {self.root_page_id}"
        )
        pages = [self._fetch_page(page_id=self.root_page_id)]
        yield from batch_generator(self._read_pages(pages), self.batch_size)

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        """Applies integration token to headers"""
        self.headers["Authorization"] = (
            f'Bearer {credentials["notion_integration_token"]}'
        )
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        """Loads all page data from a Notion workspace.

        Returns:
            list[Document]: list of documents.
        """
        # TODO: remove once Notion search issue is discovered
        if self.recursive_index_enabled and self.root_page_id:
            yield from self._recursive_load()
            return

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
        # TODO: remove once Notion search issue is discovered
        if self.recursive_index_enabled and self.root_page_id:
            yield from self._recursive_load()
            return

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
            else:
                break


if __name__ == "__main__":
    import os

    root_page_id = os.environ.get("NOTION_ROOT_PAGE_ID")
    connector = NotionConnector(root_page_id=root_page_id)
    connector.load_credentials(
        {"notion_integration_token": os.environ.get("NOTION_INTEGRATION_TOKEN")}
    )
    document_batches = connector.load_from_state()
    for doc_batch in document_batches:
        for doc in doc_batch:
            print(doc)
