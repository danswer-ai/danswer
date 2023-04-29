from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.datastores.interfaces import Datastore
from danswer.datastores.qdrant.indexing import index_chunks
from danswer.embedding.biencoder import get_default_model
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logging import setup_logger
from qdrant_client.http.models import FieldCondition
from qdrant_client.http.models import Filter
from qdrant_client.http.models import MatchValue

logger = setup_logger()


class QdrantDatastore(Datastore):
    def __init__(self, collection: str = QDRANT_DEFAULT_COLLECTION) -> None:
        self.collection = collection
        self.client = get_qdrant_client()

    def index(self, chunks: list[EmbeddedIndexChunk]) -> bool:
        return index_chunks(
            chunks=chunks, collection=self.collection, client=self.client
        )

    def search(self, query: str, num_to_retrieve: int) -> list[InferenceChunk]:
        query_embedding = get_default_model().encode(
            query
        )  # TODO: make this part of the embedder interface
        hits = self.client.search(
            collection_name=self.collection,
            query_vector=query_embedding
            if isinstance(query_embedding, list)
            else query_embedding.tolist(),
            query_filter=None,
            limit=num_to_retrieve,
        )
        return [InferenceChunk.from_dict(hit.payload) for hit in hits]

    def get_from_id(self, object_id: str) -> InferenceChunk | None:
        matches, _ = self.client.scroll(
            collection_name=self.collection,
            scroll_filter=Filter(
                should=[FieldCondition(key="id", match=MatchValue(value=object_id))]
            ),
        )
        if not matches:
            return None

        if len(matches) > 1:
            logger.error(f"Found multiple matches for {logger}: {matches}")

        match = matches[0]

        return InferenceChunk.from_dict(match.payload)
