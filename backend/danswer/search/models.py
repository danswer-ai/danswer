from enum import Enum

from pydantic import BaseModel

from danswer.indexing.models import DocAwareChunk
from danswer.indexing.models import IndexChunk


MAX_METRICS_CONTENT = (
    200  # Just need enough characters to identify where in the doc the chunk is
)


class SearchType(str, Enum):
    KEYWORD = "keyword"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"


class QueryFlow(str, Enum):
    SEARCH = "search"
    QUESTION_ANSWER = "question-answer"


class Embedder:
    def embed(self, chunks: list[DocAwareChunk]) -> list[IndexChunk]:
        raise NotImplementedError


class ChunkMetric(BaseModel):
    document_id: str
    chunk_content_start: str
    first_link: str | None
    score: float


class RetrievalMetricsContainer(BaseModel):
    keyword_search: bool  # False for Vector Search
    metrics: list[ChunkMetric]  # This contains the scores for retrieval as well


class RerankMetricsContainer(BaseModel):
    """The score held by this is the un-boosted, averaged score of the ensemble cross-encoders"""

    metrics: list[ChunkMetric]
    raw_similarity_scores: list[float]
