import uuid

from danswer.chunking.models import EmbeddedIndexChunk
from danswer.configs.constants import ALLOWED_GROUPS
from danswer.configs.constants import ALLOWED_USERS
from danswer.configs.constants import CHUNK_ID
from danswer.configs.constants import CONTENT
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import SECTION_CONTINUATION
from danswer.configs.constants import SOURCE_LINKS
from danswer.configs.constants import SOURCE_TYPE
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logging import setup_logger
from qdrant_client import QdrantClient
from qdrant_client.http.models.models import UpdateStatus
from qdrant_client.models import Distance
from qdrant_client.models import PointStruct
from qdrant_client.models import VectorParams

logger = setup_logger()

DEFAULT_BATCH_SIZE = 30


def recreate_collection(collection_name: str, embedding_dim: int = DOC_EMBEDDING_DIM):
    logger.info(f"Attempting to recreate collection {collection_name}")
    result = get_qdrant_client().recreate_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
    )
    if not result:
        raise RuntimeError("Could not create Qdrant collection")


def index_chunks(
    chunks: list[EmbeddedIndexChunk],
    collection: str,
    client: QdrantClient | None = None,
    batch_upsert: bool = False,
) -> bool:
    if client is None:
        client = get_qdrant_client()

    point_structs = []
    for chunk in chunks:
        document = chunk.source_document
        point_structs.append(
            PointStruct(
                id=str(uuid.uuid4()),
                payload={
                    DOCUMENT_ID: document.id,
                    CHUNK_ID: chunk.chunk_id,
                    CONTENT: chunk.content,
                    SOURCE_TYPE: str(
                        document.metadata.get("source_type", DocumentSource.Unknown)
                    ),
                    SOURCE_LINKS: chunk.source_links,
                    SECTION_CONTINUATION: chunk.section_continuation,
                    ALLOWED_USERS: [],  # TODO
                    ALLOWED_GROUPS: [],  # TODO
                },
                vector=chunk.embedding,
            )
        )

    index_results = None
    if batch_upsert:
        point_struct_batches = [
            point_structs[x : x + DEFAULT_BATCH_SIZE]
            for x in range(0, len(point_structs), DEFAULT_BATCH_SIZE)
        ]
        for point_struct_batch in point_struct_batches:
            index_results = client.upsert(
                collection_name=collection, points=point_struct_batch
            )
            logger.info(
                f"Indexing {len(point_struct_batch)} chunks into collection '{collection}', "
                f"status: {index_results.status}"
            )
    else:
        index_results = client.upsert(collection_name=collection, points=point_structs)
        logger.info(f"Batch indexing status: {index_results.status}")
    return index_results is not None and index_results.status == UpdateStatus.COMPLETED
