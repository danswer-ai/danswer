import json
from typing import Any
from uuid import UUID

import typesense  # type: ignore
from typesense.exceptions import ObjectNotFound  # type: ignore

from danswer.chunking.models import DocMetadataAwareIndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import BLURB
from danswer.configs.constants import CHUNK_ID
from danswer.configs.constants import CONTENT
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import METADATA
from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.configs.constants import SECTION_CONTINUATION
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINKS
from danswer.configs.constants import SOURCE_TYPE
from danswer.datastores.datastore_utils import DEFAULT_BATCH_SIZE
from danswer.datastores.datastore_utils import get_uuid_from_chunk
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.utils.batching import batch_generator
from danswer.utils.clients import get_typesense_client
from danswer.utils.logger import setup_logger


logger = setup_logger()

# how many points we want to delete/update at a time
_BATCH_SIZE = 200


def create_typesense_collection(
    collection_name: str = DOCUMENT_INDEX_NAME,
) -> None:
    ts_client = get_typesense_client()
    collection_schema = {
        "name": collection_name,
        "fields": [
            # Typesense uses "id" type string as a special field
            {"name": "id", "type": "string"},
            {"name": DOCUMENT_ID, "type": "string"},
            {"name": CHUNK_ID, "type": "int32"},
            {"name": BLURB, "type": "string"},
            {"name": CONTENT, "type": "string"},
            {"name": SOURCE_TYPE, "type": "string"},
            {"name": SOURCE_LINKS, "type": "string"},
            {"name": SEMANTIC_IDENTIFIER, "type": "string"},
            {"name": SECTION_CONTINUATION, "type": "bool"},
            {"name": ALLOWED_USERS, "type": "string[]"},
            {"name": METADATA, "type": "string"},
        ],
    }
    ts_client.collections.create(collection_schema)


def _check_typesense_collection_exist(
    collection_name: str = DOCUMENT_INDEX_NAME,
) -> bool:
    client = get_typesense_client()
    try:
        client.collections[collection_name].retrieve()
    except ObjectNotFound:
        return False
    return True


def _does_document_exist(
    doc_chunk_id: str, collection_name: str, ts_client: typesense.Client
) -> bool:
    """Returns whether the document already exists and the users/group whitelists"""
    try:
        ts_client.collections[collection_name].documents[doc_chunk_id].retrieve()
    except ObjectNotFound:
        return False

    return True


def _delete_typesense_doc_chunks(
    document_id: str, collection_name: str, ts_client: typesense.Client
) -> bool:
    doc_id_filter = {"filter_by": f"{DOCUMENT_ID}:'{document_id}'"}

    # Typesense doesn't seem to prioritize individual deletions, problem not seen with this approach
    # Point to consider if we see instances of number of Typesense and Qdrant docs not matching
    del_result = ts_client.collections[collection_name].documents.delete(doc_id_filter)
    return del_result["num_deleted"] != 0


def _index_typesense_chunks(
    chunks: list[DocMetadataAwareIndexChunk],
    collection: str,
    client: typesense.Client | None = None,
    batch_upsert: bool = True,
) -> set[DocumentInsertionRecord]:
    ts_client: typesense.Client = client if client else get_typesense_client()

    insertion_records: set[DocumentInsertionRecord] = set()
    new_documents: list[dict[str, Any]] = []
    # document ids of documents that existed BEFORE this indexing
    already_existing_documents: set[str] = set()
    for chunk in chunks:
        document = chunk.source_document
        typesense_id = str(get_uuid_from_chunk(chunk))

        # Delete all chunks related to the document if (1) it already exists and
        # (2) this is our first time running into it during this indexing attempt
        document_exists = _does_document_exist(typesense_id, collection, ts_client)
        if document_exists and document.id not in already_existing_documents:
            # Processing the first chunk of the doc and the doc exists
            _delete_typesense_doc_chunks(document.id, collection, ts_client)
            already_existing_documents.add(document.id)

        insertion_records.add(
            DocumentInsertionRecord(
                document_id=document.id,
                already_existed=document.id in already_existing_documents,
            )
        )
        new_documents.append(
            {
                "id": typesense_id,  # No minichunks for typesense
                DOCUMENT_ID: document.id,
                CHUNK_ID: chunk.chunk_id,
                BLURB: chunk.blurb,
                CONTENT: chunk.content,
                SOURCE_TYPE: str(document.source.value),
                SOURCE_LINKS: json.dumps(chunk.source_links),
                SEMANTIC_IDENTIFIER: document.semantic_identifier,
                SECTION_CONTINUATION: chunk.section_continuation,
                ALLOWED_USERS: json.dumps(chunk.access.to_acl()),
                METADATA: json.dumps(document.metadata),
            }
        )

    if batch_upsert:
        doc_batches = [
            new_documents[x : x + DEFAULT_BATCH_SIZE]
            for x in range(0, len(new_documents), DEFAULT_BATCH_SIZE)
        ]
        for doc_batch in doc_batches:
            results = ts_client.collections[collection].documents.import_(
                doc_batch, {"action": "upsert"}
            )
            failures = [
                doc_res["success"]
                for doc_res in results
                if doc_res["success"] is not True
            ]
            logger.info(
                f"Indexed {len(doc_batch)} chunks into Typesense collection '{collection}', "
                f"number failed: {len(failures)}"
            )
    else:
        [
            ts_client.collections[collection].documents.upsert(document)
            for document in new_documents
        ]

    return insertion_records


def _build_typesense_filters(
    user_id: UUID | None, filters: list[IndexFilter] | None
) -> str:
    filter_str = ""

    # Permissions filter
    if user_id:
        filter_str += f"{ALLOWED_USERS}:=[{PUBLIC_DOC_PAT},{user_id}] && "
    else:
        filter_str += f"{ALLOWED_USERS}:={PUBLIC_DOC_PAT} && "

    # Provided query filters
    if filters:
        for filter_dict in filters:
            valid_filters = {
                key: value for key, value in filter_dict.items() if value is not None
            }
            for filter_key, filter_val in valid_filters.items():
                if isinstance(filter_val, str):
                    filter_str += f"{filter_key}:={filter_val} && "
                elif isinstance(filter_val, list):
                    filters_or = ",".join([str(f_val) for f_val in filter_val])
                    filter_str += f"{filter_key}:=[{filters_or}] && "
                else:
                    raise ValueError("Invalid filters provided")
    if filter_str[-4:] == " && ":
        filter_str = filter_str[:-4]
    return filter_str


class TypesenseIndex(KeywordIndex):
    def __init__(self, index_name: str = DOCUMENT_INDEX_NAME) -> None:
        # In Typesense, the document index is referred to as a collection
        self.collection = index_name
        self.ts_client = get_typesense_client()

    def ensure_indices_exist(self) -> None:
        if not _check_typesense_collection_exist(self.collection):
            logger.info(f"Creating Typesense collection with name: {self.collection}")
            create_typesense_collection(collection_name=self.collection)

    def index(
        self, chunks: list[DocMetadataAwareIndexChunk]
    ) -> set[DocumentInsertionRecord]:
        return _index_typesense_chunks(
            chunks=chunks,
            collection=self.collection,
            client=self.ts_client,
        )

    def update(self, update_requests: list[UpdateRequest]) -> None:
        logger.info(
            f"Updating {len(update_requests)} documents' allowed_users in Typesense"
        )
        for update_request in update_requests:
            for id_batch in batch_generator(
                items=update_request.document_ids, batch_size=_BATCH_SIZE
            ):
                if update_request.access is None:
                    continue

                typesense_updates = [
                    {
                        DOCUMENT_ID: doc_id,
                        ALLOWED_USERS: update_request.access.to_acl(),
                    }
                    for doc_id in id_batch
                ]
                self.ts_client.collections[self.collection].documents.import_(
                    typesense_updates, {"action": "update"}
                )

    def delete(self, doc_ids: list[str]) -> None:
        logger.info(f"Deleting {len(doc_ids)} documents from Typesense")
        for id_batch in batch_generator(items=doc_ids, batch_size=_BATCH_SIZE):
            self.ts_client.collections[self.collection].documents.delete(
                {"filter_by": f'{DOCUMENT_ID}:[{",".join(id_batch)}]'}
            )

    def keyword_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int = NUM_RETURNED_HITS,
    ) -> list[InferenceChunk]:
        filters_str = _build_typesense_filters(user_id, filters)

        search_query = {
            "q": query,
            "query_by": CONTENT,
            "filter_by": filters_str,
            "per_page": num_to_retrieve,
            "limit_hits": num_to_retrieve,
            "num_typos": 2,
            "prefix": "false",
            # below is required to allow proper partial matching of a query
            # (partial matching = only some of the terms in the query match)
            # more info here: https://typesense-community.slack.com/archives/C01P749MET0/p1688083239192799
            "exhaustive_search": "true",
        }

        search_results = self.ts_client.collections[self.collection].documents.search(
            search_query
        )

        hits = search_results["hits"]
        inference_chunks = [InferenceChunk.from_dict(hit["document"]) for hit in hits]

        return inference_chunks
