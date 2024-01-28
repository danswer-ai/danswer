from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import EmbeddingModel
from danswer.db.models import IndexModelStatus
from danswer.indexing.models import EmbeddingModelDetail
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
    )

    db_session.add(embedding_model)
    db_session.commit()

    return embedding_model


def get_latest_embedding_model_by_status(
    status: IndexModelStatus, db_session: Session
) -> EmbeddingModel | None:
    query = (
        select(EmbeddingModel)
        .where(EmbeddingModel.status == status)
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
