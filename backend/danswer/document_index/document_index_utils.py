import math
import uuid
from typing import cast

from danswer.configs.constants import CURRENT_EMBEDDING_MODEL
from danswer.configs.constants import SECONDARY_EMBEDDING_MODEL
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.indexing.models import IndexChunk
from danswer.indexing.models import InferenceChunk


DEFAULT_BATCH_SIZE = 30


def clean_model_name(model_str: str) -> str:
    return model_str.replace("/", "_").replace("-", "_").replace(".", "_")


def get_index_name(secondary_index: bool = False) -> str:
    # TODO make this more efficient if needed
    kv_store = get_dynamic_config_store()
    if not secondary_index:
        try:
            embed_model = cast(str, kv_store.load(CURRENT_EMBEDDING_MODEL))
            return f"danswer_chunk_{clean_model_name(embed_model)}"
        except ConfigNotFoundError:
            return "danswer_chunk"

    embed_model = cast(str, kv_store.load(SECONDARY_EMBEDDING_MODEL))
    return f"danswer_chunk_{clean_model_name(embed_model)}"


def get_both_index_names() -> list[str]:
    kv_store = get_dynamic_config_store()
    try:
        embed_model = cast(str, kv_store.load(CURRENT_EMBEDDING_MODEL))
        indices = [f"danswer_chunk_{clean_model_name(embed_model)}"]
    except ConfigNotFoundError:
        indices = ["danswer_chunk"]

    try:
        embed_model = cast(str, kv_store.load(SECONDARY_EMBEDDING_MODEL))
        indices.append(f"danswer_chunk_{clean_model_name(embed_model)}")
        return indices
    except ConfigNotFoundError:
        return indices


def translate_boost_count_to_multiplier(boost: int) -> float:
    """Mapping boost integer values to a multiplier according to a sigmoid curve
    Piecewise such that at many downvotes, its 0.5x the score and with many upvotes
    it is 2x the score. This should be in line with the Vespa calculation."""
    # 3 in the equation below stretches it out to hit asymptotes slower
    if boost < 0:
        # 0.5 + sigmoid -> range of 0.5 to 1
        return 0.5 + (1 / (1 + math.exp(-1 * boost / 3)))

    # 2 x sigmoid -> range of 1 to 2
    return 2 / (1 + math.exp(-1 * boost / 3))


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
