from dataclasses import dataclass
from dataclasses import fields
from datetime import datetime
from typing import Any

from danswer.access.models import DocumentAccess
from danswer.connectors.models import Document
from danswer.utils.logger import setup_logger


logger = setup_logger()


Embedding = list[float]


@dataclass
class ChunkEmbedding:
    full_embedding: Embedding
    mini_chunk_embeddings: list[Embedding]


@dataclass
class BaseChunk:
    chunk_id: int
    blurb: str  # The first sentence(s) of the first Section of the chunk
    content: str
    source_links: dict[
        int, str
    ] | None  # Holds the link and the offsets into the raw Chunk text
    section_continuation: bool  # True if this Chunk's start is not at the start of a Section


@dataclass
class DocAwareChunk(BaseChunk):
    # During indexing flow, we have access to a complete "Document"
    # During inference we only have access to the document id and do not reconstruct the Document
    source_document: Document

    def to_short_descriptor(self) -> str:
        """Used when logging the identity of a chunk"""
        return (
            f"Chunk ID: '{self.chunk_id}'; {self.source_document.to_short_descriptor()}"
        )


@dataclass
class IndexChunk(DocAwareChunk):
    embeddings: ChunkEmbedding


@dataclass
class DocMetadataAwareIndexChunk(IndexChunk):
    """An `IndexChunk` that contains all necessary metadata to be indexed. This includes
    the following:

    access: holds all information about which users should have access to the
            source document for this chunk.
    document_sets: all document sets the source document for this chunk is a part
                   of. This is used for filtering / personas.
    """

    access: "DocumentAccess"
    document_sets: set[str]

    @classmethod
    def from_index_chunk(
        cls, index_chunk: IndexChunk, access: "DocumentAccess", document_sets: set[str]
    ) -> "DocMetadataAwareIndexChunk":
        return cls(
            **{
                field.name: getattr(index_chunk, field.name)
                for field in fields(index_chunk)
            },
            access=access,
            document_sets=document_sets,
        )


@dataclass
class InferenceChunk(BaseChunk):
    document_id: str
    source_type: str  # This is the string value of the enum already like "web"
    semantic_identifier: str
    boost: int
    recency_bias: float
    score: float | None
    hidden: bool
    metadata: dict[str, Any]
    # Matched sections in the chunk. Uses Vespa syntax e.g. <hi>TEXT</hi>
    # to specify that a set of words should be highlighted. For example:
    # ["<hi>the</hi> <hi>answer</hi> is 42", "he couldn't find an <hi>answer</hi>"]
    match_highlights: list[str]
    # when the doc was last updated
    updated_at: datetime | None

    def __repr__(self) -> str:
        blurb_words = self.blurb.split()
        short_blurb = ""
        for word in blurb_words:
            if not short_blurb:
                short_blurb = word
                continue
            if len(short_blurb) > 25:
                break
            short_blurb += " " + word
        return f"Inference Chunk: {self.document_id} - {short_blurb}..."
