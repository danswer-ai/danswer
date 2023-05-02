from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.datastores.interfaces import Datastore
from danswer.datastores.interfaces import DatastoreFilter
from danswer.datastores.qdrant.indexing import index_chunks
from danswer.embedding.biencoder import get_default_model
from danswer.utils.clients import get_qdrant_client
from danswer.utils.logging import setup_logger
from danswer.utils.timing import build_timing_wrapper
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http.models import FieldCondition
from qdrant_client.http.models import Filter
from qdrant_client.http.models import MatchAny
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

    @build_timing_wrapper()
    def semantic_retrieval(
        self, query: str, filters: list[DatastoreFilter] | None, num_to_retrieve: int
    ) -> list[InferenceChunk]:
        query_embedding = get_default_model().encode(
            query
        )  # TODO: make this part of the embedder interface
        if not isinstance(query_embedding, list):
            query_embedding = query_embedding.tolist()

        hits = []
        filter_conditions = []
        try:
            if filters:
                for filter_dict in filters:
                    valid_filters = {
                        key: value
                        for key, value in filter_dict.items()
                        if value is not None
                    }
                    for filter_key, filter_val in valid_filters.items():
                        if isinstance(filter_val, str):
                            filter_conditions.append(
                                FieldCondition(
                                    key=filter_key,
                                    match=MatchValue(value=filter_val),
                                )
                            )
                        elif isinstance(filter_val, list):
                            filter_conditions.append(
                                FieldCondition(
                                    key=filter_key,
                                    match=MatchAny(any=filter_val),
                                )
                            )
                        else:
                            raise ValueError("Invalid filters provided")

            hits = self.client.search(
                collection_name=self.collection,
                query_vector=query_embedding,
                query_filter=Filter(must=list(filter_conditions)),
                limit=num_to_retrieve,
            )
        except ResponseHandlingException as e:
            logger.exception(f'Qdrant querying failed due to: "{e}", is Qdrant set up?')
        except UnexpectedResponse as e:
            logger.exception(
                f'Qdrant querying failed due to: "{e}", has ingestion been run?'
            )
        return [InferenceChunk.from_dict(hit.payload) for hit in hits]

    def get_from_id(self, object_id: str) -> InferenceChunk | None:
        matches, _ = self.client.scroll(
            collection_name=self.collection,
            scroll_filter=Filter(
                must=[FieldCondition(key="id", match=MatchValue(value=object_id))]
            ),
        )
        if not matches:
            return None

        if len(matches) > 1:
            logger.error(f"Found multiple matches for {logger}: {matches}")

        match = matches[0]

        return InferenceChunk.from_dict(match.payload)
