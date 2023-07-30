import abc
from dataclasses import dataclass
from typing import Generic
from typing import TypeVar
from uuid import UUID

from danswer.chunking.models import BaseChunk
from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.connectors.models import IndexAttemptMetadata


T = TypeVar("T", bound=BaseChunk)
IndexFilter = dict[str, str | list[str] | None]


@dataclass
class DocumentStoreInsertionRecord:
    document_id: str
    store_id: str
    already_existed: bool


@dataclass
class DocumentStoreEntryMetadata:
    connector_id: int
    credential_id: int
    document_id: str
    store_id: str


class Indexable(Generic[T], abc.ABC):
    @abc.abstractmethod
    def index(
        self, chunks: list[T], index_attempt_metadata: IndexAttemptMetadata
    ) -> list[DocumentStoreInsertionRecord]:
        """Indexes document chunks into the Document Index and return the IDs of all the documents indexed"""
        raise NotImplementedError


class Deletable(abc.ABC):
    @abc.abstractmethod
    def delete(self, ids: list[str]) -> None:
        """Removes the specified documents from the Index"""
        raise NotImplementedError


class VectorIndex(Indexable[EmbeddedIndexChunk], Deletable, abc.ABC):
    @abc.abstractmethod
    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class KeywordIndex(Indexable[IndexChunk], Deletable, abc.ABC):
    @abc.abstractmethod
    def keyword_search(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError
