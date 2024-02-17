from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import DEFAULT_DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import OLD_DEFAULT_DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import OLD_DEFAULT_MODEL_DOC_EMBEDDING_DIM
from danswer.configs.model_configs import OLD_DEFAULT_MODEL_NORMALIZE_EMBEDDINGS
from danswer.db.connector_credential_pair import get_connector_credential_pairs
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


def insert_initial_embedding_models(db_session: Session) -> None:
    """Should be called on startup to ensure that the initial
    embedding model is present in the DB."""
    existing_embedding_models = db_session.scalars(select(EmbeddingModel)).all()
    if existing_embedding_models:
        logger.error(
            "Called `insert_initial_embedding_models` but models already exist in the DB. Skipping."
        )
        return

    existing_cc_pairs = get_connector_credential_pairs(db_session)

    # if the user is overriding the `DOCUMENT_ENCODER_MODEL`, then
    # allow them to continue to use that model and do nothing fancy
    # in the background OR if the user has no connectors, then we can
    # also just use the new model immediately
    can_skip_upgrade = (
        DOCUMENT_ENCODER_MODEL != DEFAULT_DOCUMENT_ENCODER_MODEL
        or not existing_cc_pairs
    )

    # if we need to automatically upgrade the user, then create
    # an entry which will automatically be replaced by the
    # below desired model
    if not can_skip_upgrade:
        embedding_model_to_upgrade = EmbeddingModel(
            model_name=OLD_DEFAULT_DOCUMENT_ENCODER_MODEL,
            model_dim=OLD_DEFAULT_MODEL_DOC_EMBEDDING_DIM,
            normalize=OLD_DEFAULT_MODEL_NORMALIZE_EMBEDDINGS,
            query_prefix="",
            passage_prefix="",
            status=IndexModelStatus.PRESENT,
            index_name="danswer_chunk",
        )
        db_session.add(embedding_model_to_upgrade)

    desired_embedding_model = EmbeddingModel(
        model_name=DOCUMENT_ENCODER_MODEL,
        model_dim=DOC_EMBEDDING_DIM,
        normalize=NORMALIZE_EMBEDDINGS,
        query_prefix=ASYM_QUERY_PREFIX,
        passage_prefix=ASYM_PASSAGE_PREFIX,
        status=IndexModelStatus.PRESENT
        if can_skip_upgrade
        else IndexModelStatus.FUTURE,
        index_name=f"danswer_chunk_{clean_model_name(DOCUMENT_ENCODER_MODEL)}",
    )
    db_session.add(desired_embedding_model)

    db_session.commit()
