from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import EmbeddingModel
from danswer.db.models import IndexModelStatus
from danswer.indexing.models import EmbeddingModelDetail
from danswer.search.search_nlp_models import clean_model_name
from danswer.utils.logger import setup_logger

logger = setup_logger()


def create_embedding_model(
    model_details: EmbeddingModelDetail,
    db_session: Session,
    status: IndexModelStatus = IndexModelStatus.FUTURE,
) -> EmbeddingModel:
    embedding_model = EmbeddingModel(
        model_name=model_details.model_name,
        model_dim=model_details.model_dim,
        normalize=model_details.normalize,
        query_prefix=model_details.query_prefix,
        passage_prefix=model_details.passage_prefix,
        status=status,
        # Every single embedding model except the initial one from migrations has this name
        # The initial one from migration is called "danswer_chunk"
        index_name=f"danswer_chunk_{clean_model_name(model_details.model_name)}",
    )

    db_session.add(embedding_model)
    db_session.commit()

    return embedding_model


def get_current_db_embedding_model(db_session: Session) -> EmbeddingModel:
    query = (
        select(EmbeddingModel)
        .where(EmbeddingModel.status == IndexModelStatus.PRESENT)
        .order_by(EmbeddingModel.id.desc())
    )
    result = db_session.execute(query)
    latest_model = result.scalars().first()

    if not latest_model:
        raise RuntimeError("No embedding model selected, DB is not in a valid state")

    return latest_model


def get_secondary_db_embedding_model(db_session: Session) -> EmbeddingModel | None:
    query = (
        select(EmbeddingModel)
        .where(EmbeddingModel.status == IndexModelStatus.FUTURE)
        .order_by(EmbeddingModel.id.desc())
    )
    result = db_session.execute(query)
    latest_model = result.scalars().first()

    return latest_model


def update_embedding_model_status(
    embedding_model: EmbeddingModel, new_status: IndexModelStatus, db_session: Session
) -> None:
    embedding_model.status = new_status
    db_session.commit()
