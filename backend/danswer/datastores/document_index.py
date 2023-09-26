from typing import Type
from uuid import UUID

from danswer.chunking.models import DocMetadataAwareIndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.configs.app_configs import DOCUMENT_INDEX_TYPE
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.constants import DocumentIndexType
from danswer.configs.model_configs import SEARCH_DISTANCE_CUTOFF
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import IndexFilter
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.datastores.vespa.store import VespaIndex
from danswer.utils.logger import setup_logger

logger = setup_logger()


class SplitDocumentIndex(DocumentIndex):
    """A Document index that uses 2 separate storages
    one for keyword index and one for vector index"""

    def __init__(
        self,
        index_name: str | None = DOCUMENT_INDEX_NAME,
        keyword_index_cls: Type[KeywordIndex] = TypesenseIndex,
        vector_index_cls: Type[VectorIndex] = QdrantIndex,
    ) -> None:
        index_name = index_name or DOCUMENT_INDEX_NAME
        self.keyword_index = keyword_index_cls(index_name)
        self.vector_index = vector_index_cls(index_name)

    def ensure_indices_exist(self) -> None:
        self.keyword_index.ensure_indices_exist()
        self.vector_index.ensure_indices_exist()

    def index(
        self,
        chunks: list[DocMetadataAwareIndexChunk],
    ) -> set[DocumentInsertionRecord]:
        keyword_index_result = self.keyword_index.index(chunks)
        vector_index_result = self.vector_index.index(chunks)
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

    def delete(self, doc_ids: list[str]) -> None:
        self.keyword_index.delete(doc_ids)
        self.vector_index.delete(doc_ids)

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

    def hybrid_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        """Currently results from vector and keyword indices are not combined post retrieval.
        This may change in the future but for now, the default behavior is to use semantic search
        which should be a more flexible/powerful search option"""
        return self.semantic_retrieval(query, user_id, filters, num_to_retrieve)


def get_default_document_index(
    collection: str | None = DOCUMENT_INDEX_NAME, index_type: str = DOCUMENT_INDEX_TYPE
) -> DocumentIndex:
    if index_type == DocumentIndexType.COMBINED.value:
        return VespaIndex()  # Can't specify collection without modifying the deployment
    elif index_type == DocumentIndexType.SPLIT.value:
        return SplitDocumentIndex(index_name=collection)
    else:
        raise ValueError("Invalid document index type selected")
