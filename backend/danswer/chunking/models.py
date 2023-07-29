import inspect
import json
from dataclasses import dataclass
from typing import Any
from typing import cast

from danswer.configs.constants import BLURB
from danswer.configs.constants import METADATA
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINKS
from danswer.connectors.models import Document
from danswer.utils.logger import setup_logger

logger = setup_logger()


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
    # During indexing flow, we have access to a complete "Document"
    # During inference we only have access to the document id and do not reconstruct the Document
    source_document: Document


@dataclass
class EmbeddedIndexChunk(IndexChunk):
    embeddings: list[list[float]]


@dataclass
class InferenceChunk(BaseChunk):
    document_id: str
    source_type: str
    semantic_identifier: str
    metadata: dict[str, Any]

    @classmethod
    def from_dict(cls, init_dict: dict[str, Any]) -> "InferenceChunk":
        init_kwargs = {
            k: v for k, v in init_dict.items() if k in inspect.signature(cls).parameters
        }
        if SOURCE_LINKS in init_kwargs:
            source_links = init_kwargs[SOURCE_LINKS]
            source_links_dict = (
                json.loads(source_links)
                if isinstance(source_links, str)
                else source_links
            )
            init_kwargs[SOURCE_LINKS] = {
                int(k): v for k, v in cast(dict[str, str], source_links_dict).items()
            }
        if METADATA in init_kwargs:
            init_kwargs[METADATA] = json.loads(init_kwargs[METADATA])
        else:
            init_kwargs[METADATA] = {}
        if init_kwargs.get(SEMANTIC_IDENTIFIER) is None:
            logger.error(
                f"Chunk with blurb: {init_kwargs.get(BLURB, 'Unknown')[:50]}... has no Semantic Identifier"
            )
        return cls(**init_kwargs)
