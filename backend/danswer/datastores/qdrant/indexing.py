import json
from functools import partial
from typing import cast

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.http.models.models import UpdateResult
from qdrant_client.models import PointStruct

from danswer.chunking.models import IndexChunk
from danswer.configs.constants import ALLOWED_GROUPS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import BLURB
from danswer.configs.constants import CHUNK_ID
from danswer.configs.constants import CONTENT
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import METADATA
from danswer.configs.constants import SECTION_CONTINUATION
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINKS
from danswer.configs.constants import SOURCE_TYPE
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.datastore_utils import CrossConnectorDocumentMetadata
from danswer.datastores.datastore_utils import DEFAULT_BATCH_SIZE
from danswer.datastores.datastore_utils import get_uuid_from_chunk
from danswer.datastores.datastore_utils import (
    update_cross_connector_document_metadata_map,
)
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.qdrant.utils import get_payload_from_record
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logger import setup_logger


logger = setup_logger()


def get_qdrant_document_cross_connector_metadata(
    doc_chunk_id: str, collection_name: str, q_client: QdrantClient
) -> CrossConnectorDocumentMetadata | None:
    """Get whether a document is found and the existing whitelists"""
    results = q_client.retrieve(
        collection_name=collection_name,
        ids=[doc_chunk_id],
        with_payload=[ALLOWED_USERS, ALLOWED_GROUPS],
    )
    if len(results) == 0:
        return None
    payload = get_payload_from_record(results[0])
    allowed_users = cast(list[str] | None, payload.get(ALLOWED_USERS))
    allowed_groups = cast(list[str] | None, payload.get(ALLOWED_GROUPS))
    if allowed_users is None:
        allowed_users = []
        logger.error(
            "Qdrant Index is corrupted, Document found with no user access lists."
            f"Assuming no users have access to chunk with ID '{doc_chunk_id}'."
        )
    if allowed_groups is None:
        allowed_groups = []
        logger.error(
            "Qdrant Index is corrupted, Document found with no groups access lists."
            f"Assuming no groups have access to chunk with ID '{doc_chunk_id}'."
        )

    return CrossConnectorDocumentMetadata(
        # if either `allowed_users` or `allowed_groups` are missing from the
        # point, then assume that the document has no allowed users.
        allowed_users=allowed_users,
        allowed_user_groups=allowed_groups,
        already_in_index=True,
    )


def delete_qdrant_doc_chunks(
    document_id: str, collection_name: str, q_client: QdrantClient
) -> bool:
    q_client.delete(
        collection_name=collection_name,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key=DOCUMENT_ID,
                        match=models.MatchValue(value=document_id),
                    ),
                ],
            )
        ),
    )
    return True


def index_qdrant_chunks(
    chunks: list[IndexChunk],
    index_attempt_metadata: IndexAttemptMetadata,
    collection: str,
    client: QdrantClient | None = None,
    batch_upsert: bool = True,
) -> set[DocumentInsertionRecord]:
    # Public documents will have the PUBLIC string in ALLOWED_USERS
    # If credential that kicked this off has no user associated, either Auth is off or the doc is public
    q_client: QdrantClient = client if client else get_qdrant_client()

    point_structs: list[PointStruct] = []
    insertion_records: set[DocumentInsertionRecord] = set()
    # Maps document id to dict of whitelists for users/groups each containing list of users/groups as strings
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
            doc_store_cross_connector_document_metadata_fetch_fn=partial(
                get_qdrant_document_cross_connector_metadata,
                collection_name=collection,
                q_client=q_client,
            ),
            index_attempt_metadata=index_attempt_metadata,
        )

        if should_delete_doc:
            # Processing the first chunk of the doc and the doc exists
            delete_qdrant_doc_chunks(document.id, collection, q_client)
            already_existing_documents.add(document.id)

        embeddings = chunk.embeddings
        vector_list = [embeddings.full_embedding]
        vector_list.extend(embeddings.mini_chunk_embeddings)

        for minichunk_ind, embedding in enumerate(vector_list):
            qdrant_id = str(get_uuid_from_chunk(chunk, minichunk_ind))
            insertion_records.add(
                DocumentInsertionRecord(
                    document_id=document.id,
                    already_existed=document.id in already_existing_documents,
                )
            )
            point_structs.append(
                PointStruct(
                    id=qdrant_id,
                    payload={
                        DOCUMENT_ID: document.id,
                        CHUNK_ID: chunk.chunk_id,
                        BLURB: chunk.blurb,
                        CONTENT: chunk.content,
                        SOURCE_TYPE: str(document.source.value),
                        SOURCE_LINKS: chunk.source_links,
                        SEMANTIC_IDENTIFIER: document.semantic_identifier,
                        SECTION_CONTINUATION: chunk.section_continuation,
                        ALLOWED_USERS: cross_connector_document_metadata_map[
                            document.id
                        ].allowed_users,
                        ALLOWED_GROUPS: cross_connector_document_metadata_map[
                            document.id
                        ].allowed_user_groups,
                        METADATA: json.dumps(document.metadata),
                    },
                    vector=embedding,
                )
            )

    if batch_upsert:
        point_struct_batches = [
            point_structs[x : x + DEFAULT_BATCH_SIZE]
            for x in range(0, len(point_structs), DEFAULT_BATCH_SIZE)
        ]
        for point_struct_batch in point_struct_batches:

            def upsert() -> UpdateResult | None:
                for _ in range(5):
                    try:
                        return q_client.upsert(
                            collection_name=collection, points=point_struct_batch
                        )
                    except ResponseHandlingException as e:
                        logger.warning(
                            f"Failed to upsert batch into qdrant due to error: {e}"
                        )
                return None

            index_results = upsert()
            log_status = index_results.status if index_results else "Failed"
            logger.info(
                f"Indexed {len(point_struct_batch)} chunks into Qdrant collection '{collection}', "
                f"status: {log_status}"
            )
    else:
        index_results = q_client.upsert(
            collection_name=collection, points=point_structs
        )
        logger.info(
            f"Document batch of size {len(point_structs)} indexing status: {index_results.status}"
        )

    return insertion_records
