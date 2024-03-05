import abc
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from danswer.access.models import DocumentAccess
from danswer.indexing.models import DocMetadataAwareIndexChunk
from danswer.indexing.models import InferenceChunk
from danswer.search.models import IndexFilters


@dataclass(frozen=True)
class DocumentInsertionRecord:
    document_id: str
    already_existed: bool


@dataclass
class DocumentMetadata:
    connector_id: int
    credential_id: int
    document_id: str
    semantic_identifier: str
    first_link: str
    doc_updated_at: datetime | None = None
    # Emails, not necessarily attached to users
    # Users may not be in Danswer
    primary_owners: list[str] | None = None
    secondary_owners: list[str] | None = None
    from_ingestion_api: bool = False


@dataclass
class UpdateRequest:
    """For all document_ids, update the allowed_users and the boost to the new value
    ignore if None"""

    document_ids: list[str]
    # all other fields will be left alone
    access: DocumentAccess | None = None
    document_sets: set[str] | None = None
    boost: float | None = None
    hidden: bool | None = None


class Verifiable(abc.ABC):
    @abc.abstractmethod
    def __init__(
        self,
        index_name: str,
        secondary_index_name: str | None,
        *args: Any,
        **kwargs: Any
    ) -> None:
        super().__init__(*args, **kwargs)
        self.index_name = index_name
        self.secondary_index_name = secondary_index_name

    @abc.abstractmethod
    def ensure_indices_exist(
        self,
        index_embedding_dim: int,
        secondary_index_embedding_dim: int | None,
    ) -> None:
        raise NotImplementedError


class Indexable(abc.ABC):
    @abc.abstractmethod
    def index(
        self,
        chunks: list[DocMetadataAwareIndexChunk],
    ) -> set[DocumentInsertionRecord]:
        """Indexes document chunks into the Document Index and return the IDs of all the documents indexed"""
        raise NotImplementedError


class Deletable(abc.ABC):
    @abc.abstractmethod
    def delete(self, doc_ids: list[str]) -> None:
        """Removes the specified documents from the Index"""
        raise NotImplementedError


class Updatable(abc.ABC):
    @abc.abstractmethod
    def update(self, update_requests: list[UpdateRequest]) -> None:
        """Updates metadata for the specified documents sets in the Index"""
        raise NotImplementedError


class IdRetrievalCapable(abc.ABC):
    @abc.abstractmethod
    def id_based_retrieval(
        self,
        document_id: str,
        chunk_ind: int | None,
        filters: IndexFilters,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class KeywordCapable(abc.ABC):
    @abc.abstractmethod
    def keyword_retrieval(
        self,
        query: str,
        filters: IndexFilters,
        time_decay_multiplier: float,
        num_to_retrieve: int,
        offset: int = 0,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class VectorCapable(abc.ABC):
    @abc.abstractmethod
    def semantic_retrieval(
        self,
        query: str,  # Needed for matching purposes
        query_embedding: list[float],
        filters: IndexFilters,
        time_decay_multiplier: float,
        num_to_retrieve: int,
        offset: int = 0,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class HybridCapable(abc.ABC):
    @abc.abstractmethod
    def hybrid_retrieval(
        self,
        query: str,
        query_embedding: list[float],
        filters: IndexFilters,
        time_decay_multiplier: float,
        num_to_retrieve: int,
        offset: int = 0,
        hybrid_alpha: float | None = None,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class AdminCapable(abc.ABC):
    @abc.abstractmethod
    def admin_retrieval(
        self,
        query: str,
        filters: IndexFilters,
        num_to_retrieve: int,
        offset: int = 0,
    ) -> list[InferenceChunk]:
        raise NotImplementedError


class BaseIndex(
    Verifiable,
    AdminCapable,
    IdRetrievalCapable,
    Indexable,
    Updatable,
    Deletable,
    abc.ABC,
):
    """All basic functionalities excluding a specific retrieval approach
    Indices need to be able to
    - Check that the index exists with a schema definition
    - Can index documents
    - Can delete documents
    - Can update document metadata (such as access permissions and document specific boost)
    """


class KeywordIndex(KeywordCapable, BaseIndex, abc.ABC):
    pass


class VectorIndex(VectorCapable, BaseIndex, abc.ABC):
    pass


class DocumentIndex(KeywordCapable, VectorCapable, HybridCapable, BaseIndex, abc.ABC):
    pass
