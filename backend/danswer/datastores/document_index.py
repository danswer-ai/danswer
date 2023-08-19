from typing import Type
from uuid import UUID

from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DOCUMENT_INDEX
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import SEARCH_DISTANCE_CUTOFF
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.utils.logger import setup_logger

logger = setup_logger()


class SplitDocumentIndex(DocumentIndex):
    """A Document index that uses 2 separate storages
    one for keyword index and one for vector index"""

    def __init__(
        self,
        index_name: str = DOCUMENT_INDEX,
        keyword_index_cls: Type[KeywordIndex] = TypesenseIndex,
        vector_index_cls: Type[VectorIndex] = QdrantIndex,
    ) -> None:
        self.keyword_index = keyword_index_cls(index_name)
        self.vector_index = vector_index_cls(index_name)

    def ensure_indices_exist(self) -> None:
        self.keyword_index.ensure_indices_exist()
        self.vector_index.ensure_indices_exist()

    def index(
        self,
        chunks: list[IndexChunk],
        index_attempt_metadata: IndexAttemptMetadata,
    ) -> set[DocumentInsertionRecord]:
        keyword_index_result = self.keyword_index.index(chunks, index_attempt_metadata)
        vector_index_result = self.vector_index.index(chunks, index_attempt_metadata)
        if keyword_index_result != vector_index_result:
            logger.error(
                f"Inconsistent document indexing:\n"
                f"Keyword: {keyword_index_result}\n"
                f"Vector: {vector_index_result}"
            )
        return keyword_index_result.union(vector_index_result)

    def update(self, update_requests: list[UpdateRequest]) -> None:
        self.keyword_index.update(update_requests)
        self.vector_index.update(update_requests)

    def delete(self, ids: list[str]) -> None:
        self.keyword_index.delete(ids)
        self.vector_index.delete(ids)

    def keyword_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int = NUM_RETURNED_HITS,
    ) -> list[InferenceChunk]:
        return self.keyword_index.keyword_retrieval(
            query, user_id, filters, num_to_retrieve
        )

    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int = NUM_RETURNED_HITS,
        distance_cutoff: float | None = SEARCH_DISTANCE_CUTOFF,
    ) -> list[InferenceChunk]:
        return self.vector_index.semantic_retrieval(
            query, user_id, filters, num_to_retrieve, distance_cutoff
        )
