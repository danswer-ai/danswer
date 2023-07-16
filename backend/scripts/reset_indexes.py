# This file is purely for development use, not included in any builds
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.datastores.typesense.store import create_typesense_collection
from danswer.utils.clients import get_qdrant_client
from danswer.utils.clients import get_typesense_client
from danswer.utils.logger import setup_logger
from qdrant_client.http.models import Distance
from qdrant_client.http.models import VectorParams
from typesense.exceptions import ObjectNotFound  # type: ignore

logger = setup_logger()


def recreate_qdrant_collection(
    collection_name: str, embedding_dim: int = DOC_EMBEDDING_DIM
) -> None:
    logger.info(f"Attempting to recreate Qdrant collection {collection_name}")
    result = get_qdrant_client().recreate_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
    )
    if not result:
        raise RuntimeError("Could not create Qdrant collection")


def recreate_typesense_collection(collection_name: str) -> None:
    logger.info(f"Attempting to recreate Typesense collection {collection_name}")
    ts_client = get_typesense_client()
    try:
        ts_client.collections[collection_name].delete()
    except ObjectNotFound:
        logger.debug(f"Collection {collection_name} does not already exist")

    create_typesense_collection(collection_name)


if __name__ == "__main__":
    recreate_qdrant_collection("danswer_index")
    recreate_typesense_collection("danswer_index")
