from enum import Enum

from pydantic import BaseModel

from danswer.chunking.models import DocAwareChunk
from danswer.chunking.models import IndexChunk


MAX_METRICS_CONTENT = (
    200  # Just need enough characters to identify where in the doc the chunk is
)


class SearchType(str, Enum):
    KEYWORD = "keyword"  # May be better to also try keyword search if Semantic (AI Search) is on
    SEMANTIC = "semantic"  # Really should try Semantic (AI Search) if keyword is on


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
