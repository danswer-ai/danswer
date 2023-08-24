from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import Record
from qdrant_client.models import CollectionsResponse
from qdrant_client.models import Distance
from qdrant_client.models import VectorParams

from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logger import setup_logger


logger = setup_logger()


def list_qdrant_collections(
    q_client: QdrantClient | None = None,
) -> CollectionsResponse:
    q_client = q_client or get_qdrant_client()
    return q_client.get_collections()


def create_qdrant_collection(
    collection_name: str,
    embedding_dim: int = DOC_EMBEDDING_DIM,
    q_client: QdrantClient | None = None,
) -> None:
    q_client = q_client or get_qdrant_client()
    logger.info(f"Attempting to create collection {collection_name}")
    result = q_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
    )
    if not result:
        raise RuntimeError("Could not create Qdrant collection")


def get_payload_from_record(record: Record, is_required: bool = True) -> dict[str, Any]:
    if record.payload is None and is_required:
        raise RuntimeError(
            "Qdrant Index is corrupted, Document found with no metadata."
        )

    return record.payload or {}
