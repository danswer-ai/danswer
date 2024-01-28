import math
import uuid

from sqlalchemy.orm import Session

from danswer.db.embedding_model import get_latest_embedding_model_by_status
from danswer.db.models import IndexModelStatus
from danswer.indexing.models import IndexChunk
from danswer.indexing.models import InferenceChunk
from danswer.search.search_nlp_models import clean_model_name


DEFAULT_BATCH_SIZE = 30
DEFAULT_INDEX_NAME = "danswer_chunk"


def get_index_name_from_model(model_name: str) -> str:
    return f"danswer_chunk_{clean_model_name(model_name)}"


def get_index_name(
    db_session: Session,
    secondary_index: bool = False,
) -> str:
    if secondary_index:
        model = get_latest_embedding_model_by_status(
            status=IndexModelStatus.FUTURE, db_session=db_session
        )
        if model is None:
            raise RuntimeError("No secondary index being built")
        return get_index_name_from_model(model.model_name)

    model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.PRESENT, db_session=db_session
    )
    if not model:
        return DEFAULT_INDEX_NAME
    return get_index_name_from_model(model.model_name)


def get_both_index_names(db_session: Session) -> tuple[str, str | None]:
    model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.PRESENT, db_session=db_session
    )
    curr_index = (
        DEFAULT_INDEX_NAME if not model else get_index_name_from_model(model.model_name)
    )

    model_new = get_latest_embedding_model_by_status(
        status=IndexModelStatus.FUTURE, db_session=db_session
    )
    if not model_new:
        return curr_index, None

    return curr_index, get_index_name_from_model(model_new.model_name)


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
