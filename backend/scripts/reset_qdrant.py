# This file is purely for development use, not included in any builds
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logging import setup_logger
from qdrant_client.http.models import Distance
from qdrant_client.http.models import VectorParams

logger = setup_logger()


def recreate_collection(
    collection_name: str, embedding_dim: int = DOC_EMBEDDING_DIM
) -> None:
    logger.info(f"Attempting to recreate collection {collection_name}")
    result = get_qdrant_client().recreate_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
    )
    if not result:
        raise RuntimeError("Could not create Qdrant collection")


if __name__ == "__main__":
    recreate_collection("semantic_search")
