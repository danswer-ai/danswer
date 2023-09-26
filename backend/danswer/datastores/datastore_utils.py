import math
import uuid

from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk


DEFAULT_BATCH_SIZE = 30
BOOST_MULTIPLIER = 2  # Try to keep this consistent with Vespa


def translate_boost_count_to_multiplier(boost: int) -> float:
    # Sigmoid function, maxed out at BOOST_MULTIPLIER
    # 3 here stretches it out so we hit asymptote slower
    return BOOST_MULTIPLIER / (1 + math.exp(-1 * boost / 3))


def get_uuid_from_chunk(
    chunk: IndexChunk | InferenceChunk, mini_chunk_ind: int = 0
) -> uuid.UUID:
    doc_str = (
        chunk.document_id
        if isinstance(chunk, InferenceChunk)
        else chunk.source_document.id
    )
    # Web parsing URL duplicate catching
    if doc_str and doc_str[-1] == "/":
        doc_str = doc_str[:-1]
    unique_identifier_string = "_".join(
        [doc_str, str(chunk.chunk_id), str(mini_chunk_ind)]
    )
    return uuid.uuid5(uuid.NAMESPACE_X500, unique_identifier_string)
