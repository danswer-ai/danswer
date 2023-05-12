import inspect
from dataclasses import dataclass

from danswer.connectors.models import Document


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
class IndexChunk(BaseChunk):
    source_document: Document


@dataclass
class EmbeddedIndexChunk(IndexChunk):
    embedding: list[float]


@dataclass
class InferenceChunk(BaseChunk):
    document_id: str
    source_type: str
    semantic_identifier: str

    @classmethod
    def from_dict(cls, init_dict):
        return cls(
            **{
                k: v
                for k, v in init_dict.items()
                if k in inspect.signature(cls).parameters
            }
        )
