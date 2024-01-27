from fastapi import APIRouter
from fastapi import Depends

from danswer.auth.users import current_admin_user
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
) -> None:
    raise NotImplementedError()


@router.get("/get-current-embedding-model")
def get_current_embedding_model(
    _: User | None = Depends(current_admin_user),
) -> ModelVersionResponse:
    raise NotImplementedError()


@router.get("/get-secondary-embedding-model")
def get_secondary_embedding_model(
    _: User | None = Depends(current_admin_user),
) -> ModelVersionResponse:
    raise NotImplementedError()
