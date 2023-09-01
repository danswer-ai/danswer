# This file is purely for development use, not included in any builds
import requests
from qdrant_client.http.models import Distance
from qdrant_client.http.models import VectorParams
from typesense.exceptions import ObjectNotFound  # type: ignore

from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.document_index import SplitDocumentIndex
from danswer.datastores.typesense.store import create_typesense_collection
from danswer.datastores.vespa.store import DOCUMENT_ID_ENDPOINT
from danswer.datastores.vespa.store import VespaIndex
from danswer.utils.clients import get_qdrant_client
from danswer.utils.clients import get_typesense_client
from danswer.utils.logger import setup_logger

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


def wipe_vespa_index() -> None:
    params = {"selection": "true", "cluster": DOCUMENT_INDEX_NAME}
    response = requests.delete(DOCUMENT_ID_ENDPOINT, params=params)
    response.raise_for_status()


if __name__ == "__main__":
    document_index = get_default_document_index()
    if isinstance(document_index, SplitDocumentIndex):
        recreate_qdrant_collection("danswer_index")
        recreate_typesense_collection("danswer_index")
    elif isinstance(document_index, VespaIndex):
        wipe_vespa_index()
