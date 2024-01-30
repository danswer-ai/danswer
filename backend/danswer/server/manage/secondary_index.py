from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.embedding_model import create_embedding_model
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.embedding_model import get_secondary_db_embedding_model
from danswer.db.embedding_model import update_embedding_model_status
from danswer.db.engine import get_session
from danswer.db.index_attempt import expire_index_attempts
from danswer.db.models import IndexModelStatus
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.indexing.models import EmbeddingModelDetail
from danswer.server.manage.models import FullModelVersionResponse
from danswer.server.manage.models import ModelVersionResponse
from danswer.server.models import IdReturn
from danswer.utils.logger import setup_logger

router = APIRouter(prefix="/secondary-index")
logger = setup_logger()


@router.post("/set-new-embedding-model")
def set_new_embedding_model(
    embed_model_details: EmbeddingModelDetail,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> IdReturn:
    """Creates a new EmbeddingModel row and cancels the previous secondary indexing if any
    Gives an error if the same model name is used as the current or secondary index
    """
    current_model = get_current_db_embedding_model(db_session)

    if embed_model_details.model_name == current_model.model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New embedding model is the same as the currently active one.",
        )

    secondary_model = get_secondary_db_embedding_model(db_session)

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

        # Mark previous model as a past model directly
        update_embedding_model_status(
            embedding_model=secondary_model,
            new_status=IndexModelStatus.PAST,
            db_session=db_session,
        )

    new_model = create_embedding_model(
        model_details=embed_model_details,
        db_session=db_session,
    )

    # Ensure Vespa has the new index immediately
    document_index = get_default_document_index(
        primary_index_name=current_model.index_name,
        secondary_index_name=new_model.index_name,
    )
    document_index.ensure_indices_exist(
        index_embedding_dim=current_model.model_dim,
        secondary_index_embedding_dim=new_model.model_dim,
    )

    return IdReturn(id=new_model.id)


@router.post("/cancel-new-embedding")
def cancel_new_embedding(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    secondary_model = get_secondary_db_embedding_model(db_session)

    if secondary_model:
        expire_index_attempts(
            embedding_model_id=secondary_model.id, db_session=db_session
        )

        update_embedding_model_status(
            embedding_model=secondary_model,
            new_status=IndexModelStatus.PAST,
            db_session=db_session,
        )


@router.get("/get-current-embedding-model")
def get_current_embedding_model(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ModelVersionResponse:
    current_model = get_current_db_embedding_model(db_session)
    return ModelVersionResponse(model_name=current_model.model_name)


@router.get("/get-secondary-embedding-model")
def get_secondary_embedding_model(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ModelVersionResponse:
    next_model = get_secondary_db_embedding_model(db_session)

    return ModelVersionResponse(
        model_name=next_model.model_name if next_model else None
    )


@router.get("/get-embedding-models")
def get_embedding_models(
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> FullModelVersionResponse:
    current_model = get_current_db_embedding_model(db_session)
    next_model = get_secondary_db_embedding_model(db_session)
    return FullModelVersionResponse(
        current_model_name=current_model.model_name,
        secondary_model_name=next_model.model_name if next_model else None,
    )
