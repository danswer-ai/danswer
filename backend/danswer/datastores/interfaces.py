import abc
from typing import Generic
from typing import TypeVar
from uuid import UUID

from danswer.chunking.models import BaseChunk
from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk


T = TypeVar("T", bound=BaseChunk)
IndexFilter = dict[str, str | list[str] | None]


class DocumentIndex(Generic[T], abc.ABC):
    @abc.abstractmethod
    def index(self, chunks: list[T], user_id: UUID | None) -> bool:
        raise NotImplementedError


class VectorIndex(DocumentIndex[EmbeddedIndexChunk], abc.ABC):
    @abc.abstractmethod
    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class KeywordIndex(DocumentIndex[IndexChunk], abc.ABC):
    @abc.abstractmethod
    def keyword_search(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError
