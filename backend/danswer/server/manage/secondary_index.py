from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.db.embedding_model import get_latest_embedding_model_by_status
from danswer.db.engine import get_session
from danswer.db.index_attempt import expire_index_attempts
from danswer.db.models import IndexModelStatus
from danswer.db.models import User
from danswer.indexing.models import EmbeddingModelDetail
from danswer.server.manage.models import ModelVersionResponse
from danswer.utils.logger import setup_logger

router = APIRouter(prefix="/secondary-index")
logger = setup_logger()


@router.post("/set-new-embedding-model")
def set_new_embedding_model(
    embed_model_details: EmbeddingModelDetail,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    """Creates a new EmbeddingModel row and cancels the previous secondary indexing if any
    Gives an error if the same model name is used as the current or secondary index
    """
    current_model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.PRESENT, db_session=db_session
    )
    curr_model_name = (
        current_model.model_name if current_model else DOCUMENT_ENCODER_MODEL
    )

    if embed_model_details.model_name == curr_model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New embedding model is the same as the currently active one.",
        )

    secondary_model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.FUTURE, db_session=db_session
    )

    if secondary_model:
        if embed_model_details.model_name == secondary_model.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Already reindexing with {secondary_model.model_name}",
            )

        # Cancel any background indexing jobs
        expire_index_attempts(
            embedding_model_id=secondary_model.id, db_session=db_session
        )


@router.post("/cancel-new-embedding")
def cancel_new_embedding(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    secondary_model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.FUTURE, db_session=db_session
    )

    if secondary_model:
        expire_index_attempts(
            embedding_model_id=secondary_model.id, db_session=db_session
        )


@router.get("/get-current-embedding-model")
def get_current_embedding_model(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ModelVersionResponse:
    current_model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.PRESENT, db_session=db_session
    )

    if not current_model:
        return ModelVersionResponse(model_name=DOCUMENT_ENCODER_MODEL)

    return ModelVersionResponse(model_name=current_model.model_name)


@router.get("/get-secondary-embedding-model")
def get_secondary_embedding_model(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ModelVersionResponse:
    next_model = get_latest_embedding_model_by_status(
        status=IndexModelStatus.FUTURE, db_session=db_session
    )

    return ModelVersionResponse(
        model_name=next_model.model_name if next_model else None
    )
