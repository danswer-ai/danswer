import json
from collections.abc import Mapping
from typing import Any
from typing import cast
from uuid import UUID

import requests
from requests import HTTPError
from requests import Response

from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.app_configs import VESPA_DEPLOYMENT_ZIP
from danswer.configs.app_configs import VESPA_HOST
from danswer.configs.app_configs import VESPA_PORT
from danswer.configs.app_configs import VESPA_TENANT_PORT
from danswer.configs.constants import ALLOWED_GROUPS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import BLURB
from danswer.configs.constants import BOOST
from danswer.configs.constants import CHUNK_ID
from danswer.configs.constants import CONTENT
from danswer.configs.constants import DEFAULT_BOOST
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import EMBEDDINGS
from danswer.configs.constants import METADATA
from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.configs.constants import SCORE
from danswer.configs.constants import SECTION_CONTINUATION
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINKS
from danswer.configs.constants import SOURCE_TYPE
from danswer.configs.model_configs import SEARCH_DISTANCE_CUTOFF
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.datastore_utils import CrossConnectorDocumentMetadata
from danswer.datastores.datastore_utils import get_uuid_from_chunk
from danswer.datastores.datastore_utils import (
    update_cross_connector_document_metadata_map,
)
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.vespa.utils import remove_invalid_unicode_chars
from danswer.search.semantic_search import embed_query
from danswer.utils.logger import setup_logger

logger = setup_logger()


VESPA_CONFIG_SERVER_URL = f"http://{VESPA_HOST}:{VESPA_TENANT_PORT}"
VESPA_APP_CONTAINER_URL = f"http://{VESPA_HOST}:{VESPA_PORT}"
VESPA_APPLICATION_ENDPOINT = f"{VESPA_CONFIG_SERVER_URL}/application/v2"
# danswer_chunk below is defined in vespa/app_configs/schemas/danswer_chunk.sd
DOCUMENT_ID_ENDPOINT = (
    f"{VESPA_APP_CONTAINER_URL}/document/v1/default/danswer_chunk/docid"
)
SEARCH_ENDPOINT = f"{VESPA_APP_CONTAINER_URL}/search/"
_BATCH_SIZE = 100  # Specific to Vespa


def _get_vespa_document_cross_connector_metadata(
    doc_chunk_id: str,
) -> CrossConnectorDocumentMetadata | None:
    """Returns whether the document already exists and the users/group whitelists"""
    doc_fetch_response = requests.get(f"{DOCUMENT_ID_ENDPOINT}/{doc_chunk_id}")
    if doc_fetch_response.status_code == 404:
        return None

    if doc_fetch_response.status_code != 200:
        raise RuntimeError(
            f"Unexpected fetch document by ID value from Vespa "
            f"with error {doc_fetch_response.status_code}"
        )

    doc_fields = doc_fetch_response.json()["fields"]
    allowed_users = doc_fields.get(ALLOWED_USERS)
    allowed_groups = doc_fields.get(ALLOWED_GROUPS)
    # Add group permission later, empty list gets saved/loaded as a null
    if allowed_users is None:
        raise RuntimeError(
            "Vespa Index is corrupted, Document found with no access lists."
        )
    return CrossConnectorDocumentMetadata(
        allowed_users=allowed_users or [],
        allowed_user_groups=allowed_groups or [],
        already_in_index=True,
    )


def _get_vespa_chunk_ids_by_document_id(
    document_id: str, hits_per_page: int = _BATCH_SIZE
) -> list[str]:
    offset = 0
    doc_chunk_ids = []
    params: dict[str, int | str] = {
        "yql": f"select documentid from {DOCUMENT_INDEX_NAME} where document_id contains '{document_id}'",
        "timeout": "10s",
        "offset": offset,
        "hits": hits_per_page,
    }
    while True:
        results = requests.get(SEARCH_ENDPOINT, params=params).json()
        hits = results["root"].get("children", [])
        doc_chunk_ids.extend([hit["id"].split("::")[1] for hit in hits])
        params["offset"] += hits_per_page  # type: ignore

        if len(hits) < hits_per_page:
            break
    return doc_chunk_ids


def _delete_vespa_doc_chunks(document_id: str) -> bool:
    doc_chunk_ids = _get_vespa_chunk_ids_by_document_id(document_id)

    failures = [
        requests.delete(f"{DOCUMENT_ID_ENDPOINT}/{doc}").status_code != 200
        for doc in doc_chunk_ids
    ]
    return not any(failures)


def _index_vespa_chunks(
    chunks: list[IndexChunk],
    index_attempt_metadata: IndexAttemptMetadata,
) -> set[DocumentInsertionRecord]:
    json_header = {
        "Content-Type": "application/json",
    }
    insertion_records: set[DocumentInsertionRecord] = set()
    cross_connector_document_metadata_map: dict[
        str, CrossConnectorDocumentMetadata
    ] = {}
    # document ids of documents that existed BEFORE this indexing
    already_existing_documents: set[str] = set()
    for chunk in chunks:
        document = chunk.source_document
        (
            cross_connector_document_metadata_map,
            should_delete_doc,
        ) = update_cross_connector_document_metadata_map(
            chunk=chunk,
            cross_connector_document_metadata_map=cross_connector_document_metadata_map,
            doc_store_cross_connector_document_metadata_fetch_fn=_get_vespa_document_cross_connector_metadata,
            index_attempt_metadata=index_attempt_metadata,
        )

        if should_delete_doc:
            # Processing the first chunk of the doc and the doc exists
            deletion_success = _delete_vespa_doc_chunks(document.id)
            if not deletion_success:
                raise RuntimeError(
                    f"Failed to delete pre-existing chunks for with document with id: {document.id}"
                )
            already_existing_documents.add(document.id)

        # No minichunk documents in vespa, minichunk vectors are stored in the chunk itself
        vespa_chunk_id = str(get_uuid_from_chunk(chunk))

        embeddings = chunk.embeddings
        embeddings_name_vector_map = {"full_chunk": embeddings.full_embedding}
        if embeddings.mini_chunk_embeddings:
            for ind, m_c_embed in enumerate(embeddings.mini_chunk_embeddings):
                embeddings_name_vector_map[f"mini_chunk_{ind}"] = m_c_embed

        vespa_document_fields = {
            DOCUMENT_ID: document.id,
            CHUNK_ID: chunk.chunk_id,
            BLURB: chunk.blurb,
            CONTENT: chunk.content,
            SOURCE_TYPE: str(document.source.value),
            SOURCE_LINKS: json.dumps(chunk.source_links),
            SEMANTIC_IDENTIFIER: document.semantic_identifier,
            SECTION_CONTINUATION: chunk.section_continuation,
            METADATA: json.dumps(document.metadata),
            EMBEDDINGS: embeddings_name_vector_map,
            BOOST: DEFAULT_BOOST,
            ALLOWED_USERS: cross_connector_document_metadata_map[
                document.id
            ].allowed_users,
            ALLOWED_GROUPS: cross_connector_document_metadata_map[
                document.id
            ].allowed_user_groups,
        }

        def _index_chunk(
            url: str,
            headers: dict[str, str],
            fields: dict[str, Any],
        ) -> Response:
            logger.debug(
                f"Hitting URL '{url}', with headers '{headers}', with fields '{fields}'"
            )
            res = requests.post(url, headers=headers, json={"fields": fields})
            try:
                res.raise_for_status()
                return res
            except Exception as e:
                logger.error(
                    f"Failed to index document: '{document.id}'. Got response: '{res.text}'"
                )
                raise e

        vespa_url = f"{DOCUMENT_ID_ENDPOINT}/{vespa_chunk_id}"
        try:
            _index_chunk(vespa_url, json_header, vespa_document_fields)
        except HTTPError as e:
            if cast(Response, e.response).status_code != 400:
                raise e

            # if it's a 400 response, try again with invalid unicode chars removed
            # only doing this on error to avoid having to go through the content
            # char by char every time
            vespa_document_fields[BLURB] = remove_invalid_unicode_chars(
                cast(str, vespa_document_fields[BLURB])
            )
            vespa_document_fields[SEMANTIC_IDENTIFIER] = remove_invalid_unicode_chars(
                cast(str, vespa_document_fields[SEMANTIC_IDENTIFIER])
            )
            vespa_document_fields[CONTENT] = remove_invalid_unicode_chars(
                cast(str, vespa_document_fields[CONTENT])
            )
            _index_chunk(vespa_url, json_header, vespa_document_fields)

        insertion_records.add(
            DocumentInsertionRecord(
                document_id=document.id,
                already_existed=document.id in already_existing_documents,
            )
        )

    return insertion_records


def _build_vespa_filters(
    user_id: UUID | None, filters: list[IndexFilter] | None
) -> str:
    filter_str = ""
    # Permissions filter
    # TODO group permissioning
    if user_id:
        filter_str += (
            f'({ALLOWED_USERS} contains "{user_id}" or '
            f'{ALLOWED_USERS} contains "{PUBLIC_DOC_PAT}") and '
        )
    else:
        filter_str += f'{ALLOWED_USERS} contains "{PUBLIC_DOC_PAT}" and '

    # Provided query filters
    if filters:
        for filter_dict in filters:
            valid_filters = {
                key: value for key, value in filter_dict.items() if value is not None
            }
            for filter_key, filter_val in valid_filters.items():
                if isinstance(filter_val, str):
                    filter_str += f'{filter_key} contains "{filter_val}" and '
                elif isinstance(filter_val, list):
                    eq_elems = [
                        f'{filter_key} contains "{elem}"' for elem in filter_val
                    ]
                    filters_or = " or ".join(eq_elems)
                    filter_str += f"({filters_or}) and "
                else:
                    raise ValueError("Invalid filters provided")
    return filter_str


def _build_vespa_limit(num_to_retrieve: int, offset: int = 0) -> str:
    return f" limit {num_to_retrieve} offset {offset}"


def _query_vespa(query_params: Mapping[str, str | int]) -> list[InferenceChunk]:
    if "query" in query_params and not cast(str, query_params["query"]).strip():
        raise ValueError(
            "Query only consisted of stopwords, should not use Keyword Search"
        )
    response = requests.get(SEARCH_ENDPOINT, params=query_params)
    response.raise_for_status()

    hits = response.json()["root"].get("children", [])
    inference_chunks = [
        InferenceChunk.from_dict(dict(hit["fields"], **{SCORE: hit["relevance"]}))
        for hit in hits
    ]

    return inference_chunks


class VespaIndex(DocumentIndex):
    yql_base = (
        f"select "
        f"documentid, "
        f"{DOCUMENT_ID}, "
        f"{CHUNK_ID}, "
        f"{BLURB}, "
        f"{CONTENT}, "
        f"{SOURCE_TYPE}, "
        f"{SOURCE_LINKS}, "
        f"{SEMANTIC_IDENTIFIER}, "
        f"{SECTION_CONTINUATION}, "
        f"{BOOST}, "
        f"{METADATA} "
        f"from {DOCUMENT_INDEX_NAME} where "
    )

    def __init__(self, deployment_zip: str = VESPA_DEPLOYMENT_ZIP) -> None:
        # Vespa index name isn't configurable via code alone because of the config .sd file that needs
        # to be updated + zipped + deployed, not supporting the option for simplicity
        self.deployment_zip = deployment_zip

    def ensure_indices_exist(self) -> None:
        """Verifying indices is more involved as there is no good way to
        verify the deployed app against the zip locally. But deploying the latest app.zip will ensure that
        the index is up-to-date with the expected schema and this does not erase the existing index.
        If the changes cannot be applied without conflict with existing data, it will fail with a non 200
        """
        deploy_url = f"{VESPA_APPLICATION_ENDPOINT}/tenant/default/prepareandactivate"
        logger.debug(f"Sending Vespa zip to {deploy_url}")
        headers = {"Content-Type": "application/zip"}
        with open(self.deployment_zip, "rb") as f:
            response = requests.post(deploy_url, headers=headers, data=f)
            if response.status_code != 200:
                raise RuntimeError(
                    f"Failed to prepare Vespa Danswer Index. Response: {response.text}"
                )

    def index(
        self,
        chunks: list[IndexChunk],
        index_attempt_metadata: IndexAttemptMetadata,
    ) -> set[DocumentInsertionRecord]:
        return _index_vespa_chunks(
            chunks=chunks, index_attempt_metadata=index_attempt_metadata
        )

    def update(self, update_requests: list[UpdateRequest]) -> None:
        logger.info(
            f"Updating {len(update_requests)} documents' allowed_users in Vespa"
        )

        json_header = {"Content-Type": "application/json"}

        for update_request in update_requests:
            if update_request.boost is None and update_request.allowed_users is None:
                logger.error("Update request received but nothing to update")
                continue

            update_dict: dict[str, dict] = {"fields": {}}
            if update_request.boost is not None:
                update_dict["fields"][BOOST] = {"assign": update_request.boost}
            if update_request.allowed_users is not None:
                update_dict["fields"][ALLOWED_USERS] = {
                    "assign": update_request.allowed_users
                }

            for document_id in update_request.document_ids:
                for doc_chunk_id in _get_vespa_chunk_ids_by_document_id(document_id):
                    url = f"{DOCUMENT_ID_ENDPOINT}/{doc_chunk_id}"
                    res = requests.put(
                        url, headers=json_header, data=json.dumps(update_dict)
                    )

                    try:
                        res.raise_for_status()
                    except requests.HTTPError as e:
                        failure_msg = f"Failed to update document: {document_id}"
                        raise requests.HTTPError(failure_msg) from e

    def delete(self, doc_ids: list[str]) -> None:
        logger.info(f"Deleting {len(doc_ids)} documents from Vespa")
        for doc_id in doc_ids:
            success = _delete_vespa_doc_chunks(doc_id)
            if not success:
                raise RuntimeError(
                    f"Unable to delete document with document id: {doc_id}"
                )

    def keyword_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int = NUM_RETURNED_HITS,
    ) -> list[InferenceChunk]:
        vespa_where_clauses = _build_vespa_filters(user_id, filters)
        yql = (
            VespaIndex.yql_base
            + vespa_where_clauses
            + '({grammar: "weakAnd"}userInput(@query))'
            + _build_vespa_limit(num_to_retrieve)
        )

        params: dict[str, str | int] = {
            "yql": yql,
            "query": query,
            "hits": num_to_retrieve,
            "num_to_rerank": 10 * num_to_retrieve,
            "ranking.profile": "keyword_search",
        }

        return _query_vespa(params)

    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
        distance_cutoff: float | None = SEARCH_DISTANCE_CUTOFF,
    ) -> list[InferenceChunk]:
        vespa_where_clauses = _build_vespa_filters(user_id, filters)
        yql = (
            VespaIndex.yql_base
            + vespa_where_clauses
            + f"({{targetHits: {10 * num_to_retrieve}}}nearestNeighbor(embeddings, query_embedding))"
            + _build_vespa_limit(num_to_retrieve)
        )

        query_embedding = embed_query(query)

        params = {
            "yql": yql,
            "input.query(query_embedding)": str(query_embedding),
            "ranking.profile": "semantic_search",
        }

        return _query_vespa(params)

    def hybrid_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        vespa_where_clauses = _build_vespa_filters(user_id, filters)
        yql = (
            VespaIndex.yql_base
            + vespa_where_clauses
            + f"{{targetHits: {10 * num_to_retrieve}}}nearestNeighbor(embeddings, query_embedding) or "
            + '{grammar: "weakAnd"}userInput(@query)'
            + _build_vespa_limit(num_to_retrieve)
        )

        query_embedding = embed_query(query)

        params = {
            "yql": yql,
            "query": query,
            "input.query(query_embedding)": str(query_embedding),
            "ranking.profile": "hybrid_search",
        }

        return _query_vespa(params)
