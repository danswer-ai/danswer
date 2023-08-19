from enum import Enum

from danswer.chunking.models import DocAwareChunk
from danswer.chunking.models import IndexChunk


class SearchType(str, Enum):
    KEYWORD = "keyword"  # May be better to also try keyword search if Semantic (AI Search) is on
    SEMANTIC = "semantic"  # Really should try Semantic (AI Search) if keyword is on


class QueryFlow(str, Enum):
    SEARCH = "search"
    QUESTION_ANSWER = "question-answer"


class Embedder:
    def embed(self, chunks: list[DocAwareChunk]) -> list[IndexChunk]:
        raise NotImplementedError
