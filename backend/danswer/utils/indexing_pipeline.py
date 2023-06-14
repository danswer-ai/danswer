from functools import partial
from itertools import chain
from typing import Protocol
from uuid import UUID

from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.chunking.models import EmbeddedIndexChunk
from danswer.connectors.models import Document
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.search.models import Embedder
from danswer.search.semantic_search import DefaultEmbedder


class IndexingPipelineProtocol(Protocol):
    def __call__(
        self, documents: list[Document], user_id: UUID | None
    ) -> list[EmbeddedIndexChunk]:
        ...


def _indexing_pipeline(
    *,
    chunker: Chunker,
    embedder: Embedder,
    vector_index: VectorIndex,
    keyword_index: KeywordIndex,
    documents: list[Document],
    user_id: UUID | None,
) -> list[EmbeddedIndexChunk]:
    # TODO: make entire indexing pipeline async to not block the entire process
    # when running on async endpoints
    chunks = list(chain(*[chunker.chunk(document) for document in documents]))
    # TODO keyword indexing can occur at same time as embedding
    keyword_index.index(chunks, user_id)
    chunks_with_embeddings = embedder.embed(chunks)
    vector_index.index(chunks_with_embeddings, user_id)
    return chunks_with_embeddings


def build_indexing_pipeline(
    *,
    chunker: Chunker | None = None,
    embedder: Embedder | None = None,
    vector_index: VectorIndex | None = None,
    keyword_index: KeywordIndex | None = None,
) -> IndexingPipelineProtocol:
    """Builds a pipline which takes in a list of docs and indexes them.

    Default uses _ chunker, _ embedder, and qdrant for the datastore"""
    if chunker is None:
        chunker = DefaultChunker()

    if embedder is None:
        embedder = DefaultEmbedder()

    if vector_index is None:
        vector_index = QdrantIndex()

    if keyword_index is None:
        keyword_index = TypesenseIndex()

    return partial(
        _indexing_pipeline,
        chunker=chunker,
        embedder=embedder,
        vector_index=vector_index,
        keyword_index=keyword_index,
    )
