import io
import os
from collections.abc import Callable
from collections.abc import Collection
from datetime import datetime
from datetime import timezone
from functools import lru_cache
from typing import Any
from urllib.parse import parse_qs
from urllib.parse import urlparse

import bs4
from atlassian import Confluence  # type:ignore
from requests import HTTPError

from danswer.configs.app_configs import (
    CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD,
)
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_INDEX_ARCHIVED_PAGES
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_LABELS_TO_SKIP
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_SKIP_LABEL_INDEXING
from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.confluence.confluence_utils import (
    build_confluence_document_id,
)
from danswer.connectors.confluence.confluence_utils import get_used_attachments
from danswer.connectors.confluence.rate_limit_handler import (
    make_confluence_call_handle_rate_limit,
)
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.file_processing.html_utils import format_document_soup
from danswer.utils.logger import setup_logger

logger = setup_logger()

# Potential Improvements
# 1. Include attachments, etc
# 2. Segment into Sections for more accurate linking, can split by headers but make sure no text/ordering is lost


NO_PERMISSIONS_TO_VIEW_ATTACHMENTS_ERROR_STR = (
    "User not permitted to view attachments on content"
)
NO_PARENT_OR_NO_PERMISSIONS_ERROR_STR = (
    "No parent or not permitted to view content with id"
)


class DanswerConfluence(Confluence):
    """
    This is a custom Confluence class that overrides the default Confluence class to add a custom CQL method.
    This is necessary because the default Confluence class does not properly support cql expansions.
    """

    def __init__(self, url: str, *args: Any, **kwargs: Any) -> None:
        super(DanswerConfluence, self).__init__(url, *args, **kwargs)

    def danswer_cql(
        self,
        cql: str,
        expand: str | None = None,
        cursor: str | None = None,
        limit: int = 500,
        include_archived_spaces: bool = False,
    ) -> dict[str, Any]:
        url_suffix = f"rest/api/content/search?cql={cql}"
        if expand:
            url_suffix += f"&expand={expand}"
        if cursor:
            url_suffix += f"&cursor={cursor}"
        url_suffix += f"&limit={limit}"
        if include_archived_spaces:
            url_suffix += "&includeArchivedSpaces=true"
        try:
            response = self.get(url_suffix)
            return response
        except Exception as e:
            raise e


@lru_cache()
def _get_user(user_id: str, confluence_client: DanswerConfluence) -> str:
    """Get Confluence Display Name based on the account-id or userkey value

    Args:
        user_id (str): The user id (i.e: the account-id or userkey)
        confluence_client (Confluence): The Confluence Client

    Returns:
        str: The User Display Name. 'Unknown User' if the user is deactivated or not found
    """
    user_not_found = "Unknown User"

    get_user_details_by_accountid = make_confluence_call_handle_rate_limit(
        confluence_client.get_user_details_by_accountid
    )
    try:
        logger.info(f"_get_user - get_user_details_by_accountid: id={user_id}")
        return get_user_details_by_accountid(user_id).get("displayName", user_not_found)
    except Exception as e:
        logger.warning(
            f"Unable to get the User Display Name with the id: '{user_id}' - {e}"
        )
    return user_not_found


def parse_html_page(text: str, confluence_client: DanswerConfluence) -> str:
    """Parse a Confluence html page and replace the 'user Id' by the real
        User Display Name

    Args:
        text (str): The page content
        confluence_client (Confluence): Confluence client

    Returns:
        str: loaded and formated Confluence page
    """
    soup = bs4.BeautifulSoup(text, "html.parser")
    for user in soup.findAll("ri:user"):
        user_id = (
            user.attrs["ri:account-id"]
            if "ri:account-id" in user.attrs
            else user.get("ri:userkey")
        )
        if not user_id:
            logger.warning(
                "ri:userkey not found in ri:user element. " f"Found attrs: {user.attrs}"
            )
            continue
        # Include @ sign for tagging, more clear for LLM
        user.replaceWith("@" + _get_user(user_id, confluence_client))
    return format_document_soup(soup)


def _comment_dfs(
    comments_str: str,
    comment_pages: Collection[dict[str, Any]],
    confluence_client: DanswerConfluence,
) -> str:
    get_page_child_by_type = make_confluence_call_handle_rate_limit(
        confluence_client.get_page_child_by_type
    )

    for comment_page in comment_pages:
        comment_html = comment_page["body"]["storage"]["value"]
        comments_str += "\nComment:\n" + parse_html_page(
            comment_html, confluence_client
        )
        try:
            logger.info(
                f"_comment_dfs - get_page_by_child_type: id={comment_page['id']}"
            )
            child_comment_pages = get_page_child_by_type(
                comment_page["id"],
                type="comment",
                start=None,
                limit=None,
                expand="body.storage.value",
            )
            comments_str = _comment_dfs(
                comments_str, child_comment_pages, confluence_client
            )
        except HTTPError as e:
            # not the cleanest, but I'm not aware of a nicer way to check the error
            if NO_PARENT_OR_NO_PERMISSIONS_ERROR_STR not in str(e):
                raise

    return comments_str


def _datetime_from_string(datetime_string: str) -> datetime:
    datetime_object = datetime.fromisoformat(datetime_string)

    if datetime_object.tzinfo is None:
        # If no timezone info, assume it is UTC
        datetime_object = datetime_object.replace(tzinfo=timezone.utc)
    else:
        # If not in UTC, translate it
        datetime_object = datetime_object.astimezone(timezone.utc)

    return datetime_object


class RecursiveIndexer:
    def __init__(
        self,
        batch_size: int,
        confluence_client: Confluence,
        index_recursively: bool,
        origin_page_id: str,
    ) -> None:
        self.batch_size = batch_size
        self.confluence_client = confluence_client
        self.index_recursively = index_recursively
        self.origin_page_id = origin_page_id
        self.pages = self.recurse_children_pages(self.origin_page_id)

    def get_origin_page(self) -> list[dict[str, Any]]:
        return [self._fetch_origin_page()]

    def get_pages(self) -> list[dict[str, Any]]:
        return self.pages

    def _fetch_origin_page(self) -> dict[str, Any]:
        get_page_by_id = make_confluence_call_handle_rate_limit(
            self.confluence_client.get_page_by_id
        )
        try:
            logger.info(
                f"_fetch_origin_page - get_page_by_id: id={self.origin_page_id}"
            )
            origin_page = get_page_by_id(
                self.origin_page_id, expand="body.storage.value,version,space"
            )
            return origin_page
        except Exception:
            logger.exception(
                f"Appending origin page with id {self.origin_page_id} failed."
            )
            return {}

    def recurse_children_pages(
        self,
        page_id: str,
    ) -> list[dict[str, Any]]:
        pages: list[dict[str, Any]] = []
        queue: list[str] = [page_id]
        visited_pages: set[str] = set()

        get_page_by_id = make_confluence_call_handle_rate_limit(
            self.confluence_client.get_page_by_id
        )

        get_page_child_by_type = make_confluence_call_handle_rate_limit(
            self.confluence_client.get_page_child_by_type
        )

        while queue:
            current_page_id = queue.pop(0)
            if current_page_id in visited_pages:
                continue
            visited_pages.add(current_page_id)

            try:
                # Fetch the page itself
                logger.info(
                    f"recurse_children_pages - get_page_by_id: id={current_page_id}"
                )
                page = get_page_by_id(
                    current_page_id, expand="body.storage.value,version,space"
                )
                pages.append(page)
            except Exception:
                logger.exception(f"Failed to fetch page {current_page_id}.")
                continue

            if not self.index_recursively:
                continue

            # Fetch child pages
            start = 0
            while True:
                logger.info(
                    f"recurse_children_pages - get_page_by_child_type: id={current_page_id}"
                )
                child_pages_response = get_page_child_by_type(
                    current_page_id,
                    type="page",
                    start=start,
                    limit=self.batch_size,
                    expand="",
                )
                if not child_pages_response:
                    break
                for child_page in child_pages_response:
                    child_page_id = child_page["id"]
                    queue.append(child_page_id)
                start += len(child_pages_response)

        return pages


class ConfluenceConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        wiki_base: str,
        is_cloud: bool,
        space: str = "",
        page_id: str = "",
        index_recursively: bool = True,
        batch_size: int = INDEX_BATCH_SIZE,
        continue_on_failure: bool = CONTINUE_ON_CONNECTOR_FAILURE,
        # if a page has one of the labels specified in this list, we will just
        # skip it. This is generally used to avoid indexing extra sensitive
        # pages.
        labels_to_skip: list[str] = CONFLUENCE_CONNECTOR_LABELS_TO_SKIP,
        cql_query: str | None = None,
    ) -> None:
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure
        self.labels_to_skip = set(labels_to_skip)
        self.recursive_indexer: RecursiveIndexer | None = None
        self.index_recursively = False if cql_query else index_recursively

        # Remove trailing slash from wiki_base if present
        self.wiki_base = wiki_base.rstrip("/")
        self.page_id = "" if cql_query else page_id
        self.space_level_scan = bool(not self.page_id)

        self.is_cloud = is_cloud

        self.confluence_client: DanswerConfluence | None = None

        # if a cql_query is provided, we will use it to fetch the pages
        # if no cql_query is provided, we will use the space to fetch the pages
        # if no space is provided and no cql_query, we will default to fetching all pages, regardless of space
        if cql_query:
            self.cql_query = cql_query
        elif space:
            self.cql_query = f"type=page and space='{space}'"
        else:
            self.cql_query = "type=page"

        logger.info(
            f"wiki_base: {self.wiki_base}, space: {space}, page_id: {self.page_id},"
            + f" space_level_scan: {self.space_level_scan}, index_recursively: {self.index_recursively},"
            + f" cql_query: {self.cql_query}"
        )

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        username = credentials["confluence_username"]
        access_token = credentials["confluence_access_token"]

        # see https://github.com/atlassian-api/atlassian-python-api/blob/master/atlassian/rest_client.py
        # for a list of other hidden constructor args
        self.confluence_client = DanswerConfluence(
            url=self.wiki_base,
            username=username if self.is_cloud else None,
            password=access_token if self.is_cloud else None,
            token=access_token if not self.is_cloud else None,
            backoff_and_retry=True,
            max_backoff_retries=60,
            max_backoff_seconds=60,
        )
        return None

    def _fetch_pages(
        self,
        cursor: str | None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        if self.confluence_client is None:
            raise Exception("Confluence client is not initialized")

        def _fetch_space(
            cursor: str | None, batch_size: int
        ) -> tuple[list[dict[str, Any]], str | None]:
            if not self.confluence_client:
                raise Exception("Confluence client is not initialized")
            get_all_pages = make_confluence_call_handle_rate_limit(
                self.confluence_client.danswer_cql
            )

            include_archived_spaces = (
                CONFLUENCE_CONNECTOR_INDEX_ARCHIVED_PAGES
                if not self.is_cloud
                else False
            )

            try:
                logger.info(
                    f"_fetch_space - get_all_pages: cursor={cursor} limit={batch_size}"
                )
                response = get_all_pages(
                    cql=self.cql_query,
                    cursor=cursor,
                    limit=batch_size,
                    expand="body.storage.value,version,space",
                    include_archived_spaces=include_archived_spaces,
                )
                pages = response.get("results", [])
                next_cursor = None
                if "_links" in response and "next" in response["_links"]:
                    next_link = response["_links"]["next"]
                    parsed_url = urlparse(next_link)
                    query_params = parse_qs(parsed_url.query)
                    cursor_list = query_params.get("cursor", [])
                    if cursor_list:
                        next_cursor = cursor_list[0]
                return pages, next_cursor
            except Exception:
                logger.warning(
                    f"Batch failed with cql {self.cql_query} with cursor {cursor} "
                    f"and size {batch_size}, processing pages individually..."
                )

                view_pages: list[dict[str, Any]] = []
                for _ in range(self.batch_size):
                    try:
                        logger.info(
                            f"_fetch_space - get_all_pages: cursor={cursor} limit=1"
                        )
                        response = get_all_pages(
                            cql=self.cql_query,
                            cursor=cursor,
                            limit=1,
                            expand="body.view.value,version,space",
                            include_archived_spaces=include_archived_spaces,
                        )
                        pages = response.get("results", [])
                        view_pages.extend(pages)
                        if "_links" in response and "next" in response["_links"]:
                            next_link = response["_links"]["next"]
                            parsed_url = urlparse(next_link)
                            query_params = parse_qs(parsed_url.query)
                            cursor_list = query_params.get("cursor", [])
                            if cursor_list:
                                cursor = cursor_list[0]
                            else:
                                cursor = None
                        else:
                            cursor = None
                            break
                    except HTTPError as e:
                        logger.warning(
                            f"Page failed with cql {self.cql_query} with cursor {cursor}, "
                            f"trying alternative expand option: {e}"
                        )
                        logger.info(
                            f"_fetch_space - get_all_pages - trying alternative expand: cursor={cursor} limit=1"
                        )
                        response = get_all_pages(
                            cql=self.cql_query,
                            cursor=cursor,
                            limit=1,
                            expand="body.view.value,version,space",
                        )
                        pages = response.get("results", [])
                        view_pages.extend(pages)
                        if "_links" in response and "next" in response["_links"]:
                            next_link = response["_links"]["next"]
                            parsed_url = urlparse(next_link)
                            query_params = parse_qs(parsed_url.query)
                            cursor_list = query_params.get("cursor", [])
                            if cursor_list:
                                cursor = cursor_list[0]
                            else:
                                cursor = None
                        else:
                            cursor = None
                            break

                return view_pages, cursor

        def _fetch_page() -> tuple[list[dict[str, Any]], str | None]:
            if self.confluence_client is None:
                raise Exception("Confluence client is not initialized")

            if self.recursive_indexer is None:
                self.recursive_indexer = RecursiveIndexer(
                    origin_page_id=self.page_id,
                    batch_size=self.batch_size,
                    confluence_client=self.confluence_client,
                    index_recursively=self.index_recursively,
                )

            pages = self.recursive_indexer.get_pages()
            return pages, None  # Since we fetched all pages, no cursor

        try:
            pages, next_cursor = (
                _fetch_space(cursor, self.batch_size)
                if self.space_level_scan
                else _fetch_page()
            )
            return pages, next_cursor
        except Exception as e:
            if not self.continue_on_failure:
                raise e

            logger.exception("Ran into exception when fetching pages from Confluence")
            return [], None

    def _fetch_comments(self, confluence_client: Confluence, page_id: str) -> str:
        get_page_child_by_type = make_confluence_call_handle_rate_limit(
            confluence_client.get_page_child_by_type
        )

        try:
            logger.info(f"_fetch_comments - get_page_child_by_type: id={page_id}")
            comment_pages = list(
                get_page_child_by_type(
                    page_id,
                    type="comment",
                    start=None,
                    limit=None,
                    expand="body.storage.value",
                )
            )
            return _comment_dfs("", comment_pages, confluence_client)
        except Exception as e:
            if not self.continue_on_failure:
                raise e

            logger.exception("Fetching comments from Confluence exceptioned")
            return ""

    def _fetch_labels(self, confluence_client: Confluence, page_id: str) -> list[str]:
        get_page_labels = make_confluence_call_handle_rate_limit(
            confluence_client.get_page_labels
        )
        try:
            logger.info(f"_fetch_labels - get_page_labels: id={page_id}")
            labels_response = get_page_labels(page_id)
            return [label["name"] for label in labels_response["results"]]
        except Exception as e:
            if not self.continue_on_failure:
                raise e

            logger.exception("Fetching labels from Confluence exceptioned")
            return []

    @classmethod
    def _attachment_to_download_link(
        cls, confluence_client: Confluence, attachment: dict[str, Any]
    ) -> str:
        return confluence_client.url + attachment["_links"]["download"]

    @classmethod
    def _attachment_to_content(
        cls,
        confluence_client: Confluence,
        attachment: dict[str, Any],
    ) -> str | None:
        """If it returns None, assume that we should skip this attachment."""
        if attachment["metadata"]["mediaType"] in [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/svg+xml",
            "video/mp4",
            "video/quicktime",
        ]:
            return None

        download_link = cls._attachment_to_download_link(confluence_client, attachment)

        attachment_size = attachment["extensions"]["fileSize"]
        if attachment_size > CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD:
            logger.warning(
                f"Skipping {download_link} due to size. "
                f"size={attachment_size} "
                f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD}"
            )
            return None

        logger.info(f"_attachment_to_content - _session.get: link={download_link}")
        response = confluence_client._session.get(download_link)
        if response.status_code != 200:
            logger.warning(
                f"Failed to fetch {download_link} with invalid status code {response.status_code}"
            )
            return None

        extracted_text = extract_file_text(
            io.BytesIO(response.content),
            file_name=attachment["title"],
            break_on_unprocessable=False,
        )
        if len(extracted_text) > CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD:
            logger.warning(
                f"Skipping {download_link} due to char count. "
                f"char count={len(extracted_text)} "
                f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD}"
            )
            return None

        return extracted_text

    def _fetch_attachments(
        self, confluence_client: Confluence, page_id: str, files_in_use: list[str]
    ) -> tuple[str, list[dict[str, Any]]]:
        unused_attachments: list[dict[str, Any]] = []
        files_attachment_content: list[str] = []

        get_attachments_from_content = make_confluence_call_handle_rate_limit(
            confluence_client.get_attachments_from_content
        )

        try:
            expand = "history.lastUpdated,metadata.labels"
            attachments_container = get_attachments_from_content(
                page_id, start=None, limit=None, expand=expand
            )
            for attachment in attachments_container.get("results", []):
                if attachment["title"] not in files_in_use:
                    unused_attachments.append(attachment)
                    continue

                attachment_content = self._attachment_to_content(
                    confluence_client, attachment
                )
                if attachment_content:
                    files_attachment_content.append(attachment_content)

        except Exception as e:
            if isinstance(
                e, HTTPError
            ) and NO_PERMISSIONS_TO_VIEW_ATTACHMENTS_ERROR_STR in str(e):
                logger.warning(
                    f"User does not have access to attachments on page '{page_id}'"
                )
                return "", []
            if not self.continue_on_failure:
                raise e
            logger.exception("Fetching attachments from Confluence exceptioned.")

        return "\n".join(files_attachment_content), unused_attachments

    def _get_doc_batch(
        self, cursor: str | None
    ) -> tuple[list[Any], str | None, list[dict[str, Any]]]:
        if self.confluence_client is None:
            raise Exception("Confluence client is not initialized")

        doc_batch: list[Any] = []
        unused_attachments: list[dict[str, Any]] = []

        batch, next_cursor = self._fetch_pages(cursor)

        for page in batch:
            last_modified = _datetime_from_string(page["version"]["when"])
            author = page["version"].get("by", {}).get("email")

            page_id = page["id"]

            if self.labels_to_skip or not CONFLUENCE_CONNECTOR_SKIP_LABEL_INDEXING:
                page_labels = self._fetch_labels(self.confluence_client, page_id)
            else:
                page_labels = []

            # check disallowed labels
            if self.labels_to_skip:
                label_intersection = self.labels_to_skip.intersection(page_labels)
                if label_intersection:
                    logger.info(
                        f"Page with ID '{page_id}' has a label which has been "
                        f"designated as disallowed: {label_intersection}. Skipping."
                    )
                    continue

            page_html = (
                page["body"].get("storage", page["body"].get("view", {})).get("value")
            )
            # The url and the id are the same
            page_url = build_confluence_document_id(
                self.wiki_base, page["_links"]["webui"]
            )
            if not page_html:
                logger.debug("Page is empty, skipping: %s", page_url)
                continue
            page_text = parse_html_page(page_html, self.confluence_client)

            files_in_use = get_used_attachments(page_html)
            attachment_text, unused_page_attachments = self._fetch_attachments(
                self.confluence_client, page_id, files_in_use
            )
            unused_attachments.extend(unused_page_attachments)

            page_text += "\n" + attachment_text if attachment_text else ""
            comments_text = self._fetch_comments(self.confluence_client, page_id)
            page_text += comments_text
            doc_metadata: dict[str, str | list[str]] = {
                "Wiki Space Name": page["space"]["name"]
            }
            if not CONFLUENCE_CONNECTOR_SKIP_LABEL_INDEXING and page_labels:
                doc_metadata["labels"] = page_labels

            doc_batch.append(
                Document(
                    id=page_url,
                    sections=[Section(link=page_url, text=page_text)],
                    source=DocumentSource.CONFLUENCE,
                    semantic_identifier=page["title"],
                    doc_updated_at=last_modified,
                    primary_owners=(
                        [BasicExpertInfo(email=author)] if author else None
                    ),
                    metadata=doc_metadata,
                )
            )
        return (
            doc_batch,
            next_cursor,
            unused_attachments,
        )

    def _get_attachment_batch(
        self,
        start_ind: int,
        attachments: list[dict[str, Any]],
        time_filter: Callable[[datetime], bool] | None = None,
    ) -> tuple[list[Any], int]:
        doc_batch: list[Any] = []

        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        end_ind = min(start_ind + self.batch_size, len(attachments))

        for attachment in attachments[start_ind:end_ind]:
            last_updated = _datetime_from_string(
                attachment["history"]["lastUpdated"]["when"]
            )

            if time_filter and not time_filter(last_updated):
                continue

            # The url and the id are the same
            attachment_url = build_confluence_document_id(
                self.wiki_base, attachment["_links"]["download"]
            )
            attachment_content = self._attachment_to_content(
                self.confluence_client, attachment
            )
            if attachment_content is None:
                continue

            creator_email = attachment["history"]["createdBy"].get("email")

            comment = attachment["metadata"].get("comment", "")
            doc_metadata: dict[str, Any] = {"comment": comment}

            attachment_labels: list[str] = []
            if not CONFLUENCE_CONNECTOR_SKIP_LABEL_INDEXING:
                for label in attachment["metadata"]["labels"]["results"]:
                    attachment_labels.append(label["name"])

            doc_metadata["labels"] = attachment_labels

            doc_batch.append(
                Document(
                    id=attachment_url,
                    sections=[Section(link=attachment_url, text=attachment_content)],
                    source=DocumentSource.CONFLUENCE,
                    semantic_identifier=attachment["title"],
                    doc_updated_at=last_updated,
                    primary_owners=(
                        [BasicExpertInfo(email=creator_email)]
                        if creator_email
                        else None
                    ),
                    metadata=doc_metadata,
                )
            )

        return doc_batch, end_ind - start_ind

    def _handle_batch_retrieval(
        self,
        start: float | None = None,
        end: float | None = None,
    ) -> GenerateDocumentsOutput:
        start_time = datetime.fromtimestamp(start, tz=timezone.utc) if start else None
        end_time = datetime.fromtimestamp(end, tz=timezone.utc) if end else None

        unused_attachments: list[dict[str, Any]] = []
        cursor = None
        while True:
            doc_batch, cursor, new_unused_attachments = self._get_doc_batch(cursor)
            unused_attachments.extend(new_unused_attachments)
            if doc_batch:
                yield doc_batch

            if not cursor:
                break

        # Process attachments if any
        start_ind = 0
        while True:
            attachment_batch, num_attachments = self._get_attachment_batch(
                start_ind=start_ind,
                attachments=unused_attachments,
                time_filter=(lambda t: start_time <= t <= end_time)
                if start_time and end_time
                else None,
            )

            start_ind += num_attachments
            if attachment_batch:
                yield attachment_batch

            if num_attachments < self.batch_size:
                break

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._handle_batch_retrieval()

    def poll_source(self, start: float, end: float) -> GenerateDocumentsOutput:
        return self._handle_batch_retrieval(start=start, end=end)


if __name__ == "__main__":
    connector = ConfluenceConnector(
        wiki_base=os.environ["CONFLUENCE_TEST_SPACE_URL"],
        space=os.environ["CONFLUENCE_TEST_SPACE"],
        is_cloud=os.environ.get("CONFLUENCE_IS_CLOUD", "true").lower() == "true",
        page_id=os.environ.get("CONFLUENCE_TEST_PAGE_ID", ""),
        index_recursively=True,
    )
    connector.load_credentials(
        {
            "confluence_username": os.environ["CONFLUENCE_USER_NAME"],
            "confluence_access_token": os.environ["CONFLUENCE_ACCESS_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
