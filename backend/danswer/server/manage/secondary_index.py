from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from danswer.auth.users import current_admin_user
from danswer.configs.constants import CURRENT_EMBEDDING_MODEL
from danswer.configs.constants import SECONDARY_EMBEDDING_MODEL
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.indexing.models import EmbeddingModelDetail
from danswer.server.manage.models import ModelVersionResponse
from danswer.utils.logger import setup_logger

router = APIRouter(prefix="/secondary-index")
logger = setup_logger()


@router.post("/set-embedding-model")
def set_embedding_model(
    embed_model_details: EmbeddingModelDetail,
    _: User | None = Depends(current_admin_user),
) -> None:
    kv_store = get_dynamic_config_store()

    try:
        curr_model = EmbeddingModelDetail(
            **cast(dict, kv_store.load(CURRENT_EMBEDDING_MODEL))
        ).model_name
    except ConfigNotFoundError:
        curr_model = DOCUMENT_ENCODER_MODEL

    if curr_model == embed_model_details.model_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Already using {curr_model}.",
        )

    try:
        kv_store.load(SECONDARY_EMBEDDING_MODEL)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already an update happening for a new model.",
        )
    except ConfigNotFoundError:
        # This is expected
        pass

    kv_store.store(
        key=SECONDARY_EMBEDDING_MODEL,
        val=embed_model_details.dict(),
    )

    get_default_document_index().ensure_indices_exist()


@router.get("/get-current-embedding-model")
def get_current_embedding_model(
    _: User | None = Depends(current_admin_user),
) -> ModelVersionResponse:
    kv_store = get_dynamic_config_store()

    try:
        curr_model = EmbeddingModelDetail(
            **cast(dict, kv_store.load(CURRENT_EMBEDDING_MODEL))
        )
        return ModelVersionResponse(model_name=curr_model.model_name)
    except ConfigNotFoundError:
        return ModelVersionResponse(model_name=DOCUMENT_ENCODER_MODEL)


@router.get("/get-secondary-embedding-model")
def get_secondary_embedding_model(
    _: User | None = Depends(current_admin_user),
) -> ModelVersionResponse:
    kv_store = get_dynamic_config_store()

    try:
        model = EmbeddingModelDetail(
            **cast(dict, kv_store.load(SECONDARY_EMBEDDING_MODEL))
        )
        return ModelVersionResponse(model_name=model.model_name)
    except ConfigNotFoundError:
        return ModelVersionResponse(model_name=None)
