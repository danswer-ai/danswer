from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import SKIP_RERANKING
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


class BaseFilters(BaseModel):
    source_type: list[str] | None = None
    document_set: list[str] | None = None
    time_cutoff: datetime | None = None


class IndexFilters(BaseFilters):
    access_control_list: list[str]


class ChunkMetric(BaseModel):
    document_id: str
    chunk_content_start: str
    first_link: str | None
    score: float


class SearchQuery(BaseModel):
    query: str
    search_type: SearchType
    filters: IndexFilters
    favor_recent: bool
    num_hits: int = NUM_RETURNED_HITS
    skip_rerank: bool = SKIP_RERANKING
    # Only used if not skip_rerank
    num_rerank: int | None = NUM_RERANKED_RESULTS


class RetrievalMetricsContainer(BaseModel):
    keyword_search: bool  # False for Vector Search
    metrics: list[ChunkMetric]  # This contains the scores for retrieval as well


class RerankMetricsContainer(BaseModel):
    """The score held by this is the un-boosted, averaged score of the ensemble cross-encoders"""

    metrics: list[ChunkMetric]
    raw_similarity_scores: list[float]
