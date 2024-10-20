from datetime import datetime
from datetime import timezone
from typing import Any

from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_LABELS_TO_SKIP
from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.confluence.rate_limit_handler import DanswerConfluence
from danswer.connectors.confluence.utils import attachment_to_content
from danswer.connectors.confluence.utils import build_confluence_document_id
from danswer.connectors.confluence.utils import datetime_from_string
from danswer.connectors.confluence.utils import extract_text_from_page
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SlimConnector
from danswer.connectors.interfaces import SlimDocumentOutput
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.models import SlimDocument
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
]


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
    ) -> None:
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure
        self.confluence_client: DanswerConfluence | None = None
        self.is_cloud = is_cloud

        # self.recursive_indexer: RecursiveIndexer | None = None
        self.index_recursively = False if cql_query else index_recursively

        # Remove trailing slash from wiki_base if present
        self.wiki_base = wiki_base.rstrip("/")

        if cql_query:
            # if a cql_query is provided, we will use it to fetch the pages
            self.cql_query = cql_query
        elif space:
            # if no cql_query is provided, we will use the space to fetch the pages
            self.cql_query = f"type=page and space='{space}'"
        elif page_id:
            # if neither a space nor a cql_query is provided, we will use the page_id to fetch the page
            self.cql_query = f"type=page and id='{page_id}'"
        else:
            # if nothing is provided, we will fetch all pages
            self.cql_query = "type=page"

        self.cql_label_filter = ""
        if labels_to_skip:
            labels_to_skip = list(set(labels_to_skip))
            comma_separated_labels = ",".join(labels_to_skip)
            self.cql_label_filter = f"&label not in ({comma_separated_labels})"
            self.cql_query += self.cql_label_filter

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

    def _get_comment_string_for_page_id(self, page_id: str) -> str:
        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        comment_string = ""

        comment_cql = f"type=comment and container='{page_id}'"
        comment_cql += self.cql_label_filter

        expand = ",".join(_COMMENT_EXPANSION_FIELDS)
        for comments in self.confluence_client.paginated_cql_retrieval(
            cql=comment_cql,
            expand=expand,
        ):
            for comment in comments:
                comment_html = comment["body"]["storage"]["value"]
                comment_string += "\nComment:\n" + extract_text_from_page(
                    comment_html, self.confluence_client
                )

        return comment_string

    def _convert_object_to_document(self, object: dict[str, Any]) -> Document | None:
        """
        Takes in a confluence object, extracts all metadata, and converts it into a document.
        If its a page, it extracts the text, adds the comments for the document text.
        If its an attachment, it just downloads the attachment and converts that into a document.
        """
        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        # The url and the id are the same
        object_url = build_confluence_document_id(
            self.wiki_base, object["_links"]["webui"]
        )

        object_text = None
        # Extract text from page
        if object["type"] == "page":
            object_text = extract_text_from_page(self.confluence_client, object)
            # Add comments to text
            object_text += self._get_comment_string_for_page_id(object["id"])
        elif object["type"] == "attachment":
            object_text = attachment_to_content(self.confluence_client, object)

        if object_text is None:
            return None

        # Get space name
        doc_metadata: dict[str, str | list[str]] = {
            "Wiki Space Name": object["space"]["name"]
        }

        # Get labels
        label_dicts = object["metadata"]["labels"]["results"]
        page_labels = [label["name"] for label in label_dicts]
        if page_labels:
            doc_metadata["labels"] = page_labels

        # Get last modified and author email
        last_modified = datetime_from_string(object["version"]["when"])
        author_email = object["version"].get("by", {}).get("email")

        return Document(
            id=object_url,
            sections=[Section(link=object_url, text=object_text)],
            source=DocumentSource.CONFLUENCE,
            semantic_identifier=object["title"],
            doc_updated_at=last_modified,
            primary_owners=(
                [BasicExpertInfo(email=author_email)] if author_email else None
            ),
            metadata=doc_metadata,
        )

    def _fetch_document_batches(self) -> GenerateDocumentsOutput:
        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        doc_batch: list[Document] = []
        confluence_page_ids: list[str] = []

        # Fetch pages as Documents
        for pages in self.confluence_client.paginated_cql_retrieval(
            cql=self.cql_query,
            expand=",".join(_PAGE_EXPANSION_FIELDS),
            limit=self.batch_size,
        ):
            for page in pages:
                confluence_page_ids.append(page["id"])
                doc = self._convert_object_to_document(page)
                if doc is not None:
                    doc_batch.append(doc)
                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

        # Fetch attachments as Documents
        for confluence_page_id in confluence_page_ids:
            attachment_cql = f"type=attachment and container='{confluence_page_id}'"
            attachment_cql += self.cql_label_filter
            # TODO: maybe should add time filter as well?
            for attachments in self.confluence_client.paginated_cql_retrieval(
                cql=attachment_cql,
                expand=",".join(_ATTACHMENT_EXPANSION_FIELDS),
            ):
                for attachment in attachments:
                    doc = self._convert_object_to_document(attachment)
                    if doc is not None:
                        doc_batch.append(doc)
                    if len(doc_batch) >= self.batch_size:
                        yield doc_batch
                        doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_document_batches()

    def poll_source(self, start: float, end: float) -> GenerateDocumentsOutput:
        # Add time filters
        formatted_start_time = datetime.fromtimestamp(start, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )
        formatted_end_time = datetime.fromtimestamp(end, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )
        self.cql_query += f" and lastmodified >= '{formatted_start_time}'"
        self.cql_query += f" and lastmodified <= '{formatted_end_time}'"
        return self._fetch_document_batches()

    def retrieve_all_slim_documents(self) -> SlimDocumentOutput:
        if self.confluence_client is None:
            raise ConnectorMissingCredentialError("Confluence")

        confluence_page_ids: list[str] = []
        doc_metadata_list: list[SlimDocument] = []

        for pages in self.confluence_client.paginated_cql_retrieval(
            cql=self.cql_query,
        ):
            for page in pages:
                confluence_page_ids.append(page["id"])
                doc_metadata_list.append(
                    SlimDocument(
                        id=build_confluence_document_id(
                            self.wiki_base, page["_links"]["webui"]
                        ),
                        perm_sync_data={},
                    )
                )
            yield doc_metadata_list
            doc_metadata_list = []

        for confluence_page_id in confluence_page_ids:
            attachment_cql = f"type=attachment and container='{confluence_page_id}'"
            attachment_cql += self.cql_label_filter
            for attachments in self.confluence_client.paginated_cql_retrieval(
                cql=attachment_cql,
            ):
                for attachment in attachments:
                    doc_metadata_list.append(
                        SlimDocument(
                            id=build_confluence_document_id(
                                self.wiki_base, attachment["_links"]["webui"]
                            ),
                            perm_sync_data={},
                        )
                    )
            yield doc_metadata_list
            doc_metadata_list = []
