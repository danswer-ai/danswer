from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any
from urllib.parse import quote

from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_LABELS_TO_SKIP
from danswer.configs.app_configs import (
    CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED,
)
from danswer.configs.app_configs import CONFLUENCE_TIMEZONE_OFFSET
from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.confluence.onyx_confluence import build_confluence_client
from danswer.connectors.confluence.onyx_confluence import OnyxConfluence
from danswer.connectors.confluence.utils import attachment_to_content
from danswer.connectors.confluence.utils import build_confluence_document_id
from danswer.connectors.confluence.utils import datetime_from_string
from danswer.connectors.confluence.utils import extract_text_from_confluence_html
from danswer.connectors.confluence.utils import validate_attachment_filetype
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import GenerateSlimDocumentOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.interfaces import SlimConnector
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.models import SlimDocument
from danswer.llm.factory import get_default_llms
from danswer.utils.logger import setup_logger


logger = setup_logger()

# Potential Improvements
# 1. Include attachments, etc
# 2. Segment into Sections for more accurate linking, can split by headers but make sure no text/ordering is lost

_COMMENT_EXPANSION_FIELDS = ["body.storage.value"]
_PAGE_EXPANSION_FIELDS = [
    "body.storage.value",
    "version",
    "space",
    "metadata.labels",
]
_ATTACHMENT_EXPANSION_FIELDS = [
    "version",
    "space",
    "metadata.labels",
    "history.lastUpdated",
]

_RESTRICTIONS_EXPANSION_FIELDS = [
    "space",
    "restrictions.read.restrictions.user",
    "restrictions.read.restrictions.group",
]

_SLIM_DOC_BATCH_SIZE = 5000


class ConfluenceConnector(LoadConnector, PollConnector, SlimConnector):
    def __init__(
        self,
        wiki_base: str,
        is_cloud: bool,
        space: str = "",
        page_id: str = "",
        index_recursively: bool = True,
        cql_query: str | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
        continue_on_failure: bool = CONTINUE_ON_CONNECTOR_FAILURE,
        # if a page has one of the labels specified in this list, we will just
        # skip it. This is generally used to avoid indexing extra sensitive
        # pages.
        labels_to_skip: list[str] = CONFLUENCE_CONNECTOR_LABELS_TO_SKIP,
        timezone_offset: float = CONFLUENCE_TIMEZONE_OFFSET,
    ) -> None:
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure
        self._confluence_client: OnyxConfluence | None = None
        self.is_cloud = is_cloud

        # Remove trailing slash from wiki_base if present
        self.wiki_base = wiki_base.rstrip("/")

        # if nothing is provided, we will fetch all pages
        cql_page_query = "type=page"
        if cql_query:
            # if a cql_query is provided, we will use it to fetch the pages
            cql_page_query = cql_query
        elif page_id:
            # if a cql_query is not provided, we will use the page_id to fetch the page
            if index_recursively:
                cql_page_query += f" and ancestor='{page_id}'"
            else:
                cql_page_query += f" and id='{page_id}'"
        elif space:
            # if no cql_query or page_id is provided, we will use the space to fetch the pages
            cql_page_query += f" and space='{quote(space)}'"

        self.cql_page_query = cql_page_query
        self.cql_time_filter = ""

        self.cql_label_filter = ""
        if labels_to_skip:
            labels_to_skip = list(set(labels_to_skip))
            comma_separated_labels = ",".join(
                f"'{quote(label)}'" for label in labels_to_skip
            )
            self.cql_label_filter = f" and label not in ({comma_separated_labels})"

        self.timezone: timezone = timezone(offset=timedelta(hours=timezone_offset))

        # If image summarization is enabled, but not supported by the default LLM, raise an error.
        if CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED:
            llm, _ = get_default_llms()
            if not llm.vision_support():
                raise ValueError(
                    "The configured default LLM doesn't seem to have vision support for image summarization."
                )

            self.llm = llm
        else:
            self.llm = None

    @property
    def confluence_client(self) -> OnyxConfluence:
        if self._confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")
        return self._confluence_client

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        # see https://github.com/atlassian-api/atlassian-python-api/blob/master/atlassian/rest_client.py
        # for a list of other hidden constructor args
        self._confluence_client = build_confluence_client(
            credentials=credentials,
            is_cloud=self.is_cloud,
            wiki_base=self.wiki_base,
        )
        return None

    def _get_comment_string_for_page_id(self, page_id: str) -> str:
        comment_string = ""

        comment_cql = f"type=comment and container='{page_id}'"
        comment_cql += self.cql_label_filter

        expand = ",".join(_COMMENT_EXPANSION_FIELDS)
        for comment in self.confluence_client.paginated_cql_retrieval(
            cql=comment_cql,
            expand=expand,
        ):
            comment_string += "\nComment:\n"
            comment_string += extract_text_from_confluence_html(
                confluence_client=self.confluence_client,
                confluence_object=comment,
                fetched_titles=set(),
            )

        return comment_string

    def _convert_page_to_document(self, page: dict[str, Any]) -> Document | None:
        """
        Takes in a confluence object, extracts all metadata, and converts it into a document.
        If it's a page, it extracts the text, adds the comments for the document text.
        If it's an attachment, it just downloads the attachment and converts that into a document.
        If image summarization is enabled (env var CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED is set),
        images are extracted and summarized by the default LLM.
        """
        # The url and the id are the same
        object_url = build_confluence_document_id(
            self.wiki_base, page["_links"]["webui"], self.is_cloud
        )
        logger.notice(f"processing page: {object_url}")

        # Get space name
        doc_metadata: dict[str, str | list[str]] = {
            "Wiki Space Name": page["space"]["name"]
        }

        # Get labels
        label_dicts = page["metadata"]["labels"]["results"]
        page_labels = [label["name"] for label in label_dicts]
        if page_labels:
            doc_metadata["labels"] = page_labels

        # Get last modified and author email
        last_modified = datetime_from_string(page["version"]["when"])
        author_email = page["version"].get("by", {}).get("email")

        # Extract text from page
        object_text = extract_text_from_confluence_html(
            confluence_client=self.confluence_client,
            confluence_object=page,
            fetched_titles={page.get("title", "")},
        )
        # Add comments to text
        object_text += self._get_comment_string_for_page_id(page["id"])

        if object_text is None:
            # This only happens for attachments that are not parsable
            return None

        return Document(
            id=object_url,
            sections=[Section(link=object_url, text=object_text)],
            source=DocumentSource.CONFLUENCE,
            semantic_identifier=page["title"],
            doc_updated_at=last_modified,
            primary_owners=(
                [BasicExpertInfo(email=author_email)] if author_email else None
            ),
            metadata=doc_metadata,
        )

    def _fetch_document_batches(self) -> GenerateDocumentsOutput:
        doc_batch: list[Document] = []

        page_query = self.cql_page_query + self.cql_label_filter + self.cql_time_filter
        logger.debug(f"page_query: {page_query}")
        # Fetch pages as Documents
        for page in self.confluence_client.paginated_cql_retrieval(
            cql=page_query,
            expand=",".join(_PAGE_EXPANSION_FIELDS),
            limit=self.batch_size,
        ):
            logger.debug(f"_fetch_document_batches: {page['id']}")
            doc = self._convert_page_to_document(page)

            if doc is not None:
                doc_batch.append(doc)

            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

            # fetch attachments of each page directly after each page
            # to be able to use the XML text of each page as context when summarizing the images of each page
            # (only if CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED = True, otherwise images will be skipped)
            attachment_cql = f"type=attachment and container='{page['id']}'"
            attachment_cql += self.cql_label_filter

            confluence_xml = page["body"]["storage"]["value"]

            for attachment in self.confluence_client.paginated_cql_retrieval(
                cql=attachment_cql,
                expand=",".join(_ATTACHMENT_EXPANSION_FIELDS),
            ):
                content = attachment_to_content(
                    confluence_client=self.confluence_client,
                    attachment=attachment,
                    page_context=confluence_xml,
                    llm=self.llm,
                )

                if content:
                    # get link to attachment in webui
                    webui_link = _attachment_to_webui_link(
                        self.confluence_client, attachment
                    )
                    # add prefix to text to mark attachments as such
                    text = f"## Text representation of attachment {attachment['title']}:\n{content}"
                    doc.sections.append(Section(text=text, link=webui_link))

            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_document_batches()

    def poll_source(self, start: float, end: float) -> GenerateDocumentsOutput:
        # Add time filters
        formatted_start_time = datetime.fromtimestamp(start, tz=self.timezone).strftime(
            "%Y-%m-%d %H:%M"
        )
        formatted_end_time = datetime.fromtimestamp(end, tz=self.timezone).strftime(
            "%Y-%m-%d %H:%M"
        )
        self.cql_time_filter = f" and lastmodified >= '{formatted_start_time}'"
        self.cql_time_filter += f" and lastmodified <= '{formatted_end_time}'"
        return self._fetch_document_batches()

    def retrieve_all_slim_documents(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        doc_metadata_list: list[SlimDocument] = []

        restrictions_expand = ",".join(_RESTRICTIONS_EXPANSION_FIELDS)

        page_query = self.cql_page_query + self.cql_label_filter
        for page in self.confluence_client.cql_paginate_all_expansions(
            cql=page_query,
            expand=restrictions_expand,
            limit=_SLIM_DOC_BATCH_SIZE,
        ):
            # If the page has restrictions, add them to the perm_sync_data
            # These will be used by doc_sync.py to sync permissions
            page_restrictions = page.get("restrictions")
            page_space_key = page.get("space", {}).get("key")
            page_perm_sync_data = {
                "restrictions": page_restrictions or {},
                "space_key": page_space_key,
            }

            doc_metadata_list.append(
                SlimDocument(
                    id=build_confluence_document_id(
                        self.wiki_base,
                        page["_links"]["webui"],
                        self.is_cloud,
                    ),
                    perm_sync_data=page_perm_sync_data,
                )
            )
            attachment_cql = f"type=attachment and container='{page['id']}'"
            attachment_cql += self.cql_label_filter
            for attachment in self.confluence_client.cql_paginate_all_expansions(
                cql=attachment_cql,
                expand=restrictions_expand,
                limit=_SLIM_DOC_BATCH_SIZE,
            ):
                media_type = attachment["metadata"]["mediaType"]
                if not validate_attachment_filetype(media_type):
                    continue
                attachment_restrictions = attachment.get("restrictions")
                if not attachment_restrictions:
                    attachment_restrictions = page_restrictions

                attachment_space_key = attachment.get("space", {}).get("key")
                if not attachment_space_key:
                    attachment_space_key = page_space_key

                attachment_perm_sync_data = {
                    "restrictions": attachment_restrictions or {},
                    "space_key": attachment_space_key,
                }

                doc_metadata_list.append(
                    SlimDocument(
                        id=build_confluence_document_id(
                            self.wiki_base,
                            attachment["_links"]["webui"],
                            self.is_cloud,
                        ),
                        perm_sync_data=attachment_perm_sync_data,
                    )
                )
            yield doc_metadata_list
            doc_metadata_list = []


def _attachment_to_webui_link(
    confluence_client: OnyxConfluence, attachment: dict[str, Any]
) -> str:
    """Extracts the webui link to images."""
    return confluence_client.url + attachment["_links"]["webui"]
