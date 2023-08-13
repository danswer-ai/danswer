import abc
from dataclasses import dataclass
from enum import Enum
from typing import Any
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


class StoreType(str, Enum):
    VECTOR = "vector"
    KEYWORD = "keyword"


@dataclass
class ChunkInsertionRecord:
    document_id: str
    store_id: str
    already_existed: bool


@dataclass
class ChunkMetadata:
    connector_id: int
    credential_id: int
    document_id: str
    store_id: str
    document_store_type: StoreType


@dataclass
class UpdateRequest:
    ids: list[str]
    # all other fields will be left alone
    allowed_users: list[str]


class Indexable(Generic[T], abc.ABC):
    @abc.abstractmethod
    def index(
        self, chunks: list[T], index_attempt_metadata: IndexAttemptMetadata
    ) -> list[ChunkInsertionRecord]:
        """Indexes document chunks into the Document Index and return the IDs of all the documents indexed"""
        raise NotImplementedError


class Deletable(abc.ABC):
    @abc.abstractmethod
    def delete(self, ids: list[str]) -> None:
        """Removes the specified documents from the Index"""
        raise NotImplementedError


class Updatable(abc.ABC):
    @abc.abstractmethod
    def update(self, update_requests: list[UpdateRequest]) -> None:
        """Updates metadata for the specified documents in the Index"""
        raise NotImplementedError


class VectorIndex(Indexable[EmbeddedIndexChunk], Deletable, Updatable, abc.ABC):
    @abc.abstractmethod
    def semantic_retrieval(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class KeywordIndex(Indexable[IndexChunk], Deletable, Updatable, abc.ABC):
    @abc.abstractmethod
    def keyword_search(
        self,
        query: str,
        user_id: UUID | None,
        filters: list[IndexFilter] | None,
        num_to_retrieve: int,
    ) -> list[InferenceChunk]:
        raise NotImplementedError
