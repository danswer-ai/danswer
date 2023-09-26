import json

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.http.models.models import UpdateResult
from qdrant_client.models import PointStruct

from danswer.chunking.models import DocMetadataAwareIndexChunk
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
from danswer.datastores.datastore_utils import DEFAULT_BATCH_SIZE
from danswer.datastores.datastore_utils import get_uuid_from_chunk
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logger import setup_logger


logger = setup_logger()


def _does_document_exist(
    doc_chunk_id: str, collection_name: str, q_client: QdrantClient
) -> bool:
    """Get whether a document is found and the existing whitelists"""
    results = q_client.retrieve(
        collection_name=collection_name,
        ids=[doc_chunk_id],
    )
    if len(results) == 0:
        return False

    return True


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
    chunks: list[DocMetadataAwareIndexChunk],
    collection: str,
    client: QdrantClient | None = None,
    batch_upsert: bool = True,
) -> set[DocumentInsertionRecord]:
    # Public documents will have the PUBLIC string in ALLOWED_USERS
    # If credential that kicked this off has no user associated, either Auth is off or the doc is public
    q_client: QdrantClient = client if client else get_qdrant_client()

    point_structs: list[PointStruct] = []
    insertion_records: set[DocumentInsertionRecord] = set()
    # document ids of documents that existed BEFORE this indexing
    already_existing_documents: set[str] = set()
    for chunk in chunks:
        document = chunk.source_document

        # Delete all chunks related to the document if (1) it already exists and
        # (2) this is our first time running into it during this indexing attempt
        document_exists = _does_document_exist(document.id, collection, q_client)
        if document_exists and document.id not in already_existing_documents:
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
                        ALLOWED_USERS: json.dumps(chunk.access.to_acl()),
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
