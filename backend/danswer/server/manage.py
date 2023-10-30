from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import GENERATIVE_MODEL_ACCESS_CHECK_FREQ
from danswer.configs.constants import GEN_AI_API_KEY_STORAGE_KEY
from danswer.db.connector_credential_pair import add_credential_to_connector
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import remove_credential_from_connector
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.engine import get_session
from danswer.db.feedback import fetch_docs_ranked_by_boost
from danswer.db.feedback import update_document_boost
from danswer.db.feedback import update_document_hidden
from danswer.db.models import User
from danswer.direct_qa.llm_utils import check_model_api_key_is_valid
from danswer.direct_qa.llm_utils import get_default_qa_model
from danswer.direct_qa.open_ai import get_gen_ai_api_key
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import ApiKey
from danswer.server.models import BoostDoc
from danswer.server.models import BoostUpdateRequest
from danswer.server.models import ConnectorCredentialPairIdentifier
from danswer.server.models import ConnectorCredentialPairMetadata
from danswer.server.models import HiddenUpdateRequest
from danswer.server.models import StatusResponse
from danswer.server.models import UserRoleResponse
from danswer.utils.logger import setup_logger

router = APIRouter(prefix="/manage")
logger = setup_logger()


"""Admin only API endpoints"""


@router.get("/admin/doc-boosts")
def get_most_boosted_docs(
    ascending: bool,
    limit: int,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[BoostDoc]:
    boost_docs = fetch_docs_ranked_by_boost(
        ascending=ascending, limit=limit, db_session=db_session
    )
    return [
        BoostDoc(
            document_id=doc.id,
            semantic_id=doc.semantic_id,
            # source=doc.source,
            link=doc.link or "",
            boost=doc.boost,
            hidden=doc.hidden,
        )
        for doc in boost_docs
    ]


@router.post("/admin/doc-boosts")
def document_boost_update(
    boost_update: BoostUpdateRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_document_boost(
            db_session=db_session,
            document_id=boost_update.document_id,
            boost=boost_update.boost,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/doc-hidden")
def document_hidden_update(
    hidden_update: HiddenUpdateRequest,
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        update_document_hidden(
            db_session=db_session,
            document_id=hidden_update.document_id,
            hidden=hidden_update.hidden,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.head("/admin/genai-api-key/validate")
def validate_existing_genai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    # OpenAI key is only used for generative QA, so no need to validate this
    # if it's turned off or if a non-OpenAI model is being used
    if DISABLE_GENERATIVE_AI or not get_default_qa_model().requires_api_key:
        return

    # Only validate every so often
    check_key_time = "genai_api_key_last_check_time"
    kv_store = get_dynamic_config_store()
    curr_time = datetime.now(tz=timezone.utc)
    try:
        last_check = datetime.fromtimestamp(
            cast(float, kv_store.load(check_key_time)), tz=timezone.utc
        )
        check_freq_sec = timedelta(seconds=GENERATIVE_MODEL_ACCESS_CHECK_FREQ)
        if curr_time - last_check < check_freq_sec:
            return
    except ConfigNotFoundError:
        # First time checking the key, nothing unusual
        pass

    genai_api_key = get_gen_ai_api_key()
    if genai_api_key is None:
        raise HTTPException(status_code=404, detail="Key not found")

    try:
        is_valid = check_model_api_key_is_valid(genai_api_key)
    except ValueError:
        # this is the case where they aren't using an OpenAI-based model
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API key provided")

    # mark check as successful
    get_dynamic_config_store().store(check_key_time, curr_time.timestamp())


@router.get("/admin/genai-api-key", response_model=ApiKey)
def get_gen_ai_api_key_from_dynamic_config_store(
    _: User = Depends(current_admin_user),
) -> ApiKey:
    """
    NOTE: Only gets value from dynamic config store as to not expose env variables.
    """
    try:
        # only get last 4 characters of key to not expose full key
        return ApiKey(
            api_key=cast(
                str, get_dynamic_config_store().load(GEN_AI_API_KEY_STORAGE_KEY)
            )[-4:]
        )
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")


@router.put("/admin/genai-api-key")
def store_genai_api_key(
    request: ApiKey,
    _: User = Depends(current_admin_user),
) -> None:
    try:
        is_valid = check_model_api_key_is_valid(request.api_key)
        if not is_valid:
            raise HTTPException(400, "Invalid API key provided")
        get_dynamic_config_store().store(GEN_AI_API_KEY_STORAGE_KEY, request.api_key)
    except RuntimeError as e:
        raise HTTPException(400, str(e))


@router.delete("/admin/genai-api-key")
def delete_genai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    get_dynamic_config_store().delete(GEN_AI_API_KEY_STORAGE_KEY)


@router.post("/admin/deletion-attempt")
def create_deletion_attempt_for_connector_id(
    connector_credential_pair_identifier: ConnectorCredentialPairIdentifier,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    from danswer.background.celery.celery import cleanup_connector_credential_pair_task

    connector_id = connector_credential_pair_identifier.connector_id
    credential_id = connector_credential_pair_identifier.credential_id

    cc_pair = get_connector_credential_pair(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    if cc_pair is None:
        raise HTTPException(
            status_code=404,
            detail=f"Connector with ID '{connector_id}' and credential ID "
            f"'{credential_id}' does not exist. Has it already been deleted?",
        )

    if not check_deletion_attempt_is_allowed(connector_credential_pair=cc_pair):
        raise HTTPException(
            status_code=400,
            detail=f"Connector with ID '{connector_id}' and credential ID "
            f"'{credential_id}' is not deletable. It must be both disabled AND have"
            "no ongoing / planned indexing attempts.",
        )

    cleanup_connector_credential_pair_task.apply_async(
        kwargs=dict(connector_id=connector_id, credential_id=credential_id),
    )


"""Endpoints for basic users"""


@router.get("/get-user-role", response_model=UserRoleResponse)
async def get_user_role(user: User = Depends(current_user)) -> UserRoleResponse:
    if user is None:
        raise ValueError("Invalid or missing user.")
    return UserRoleResponse(role=user.role)


@router.put("/connector/{connector_id}/credential/{credential_id}")
def associate_credential_to_connector(
    connector_id: int,
    credential_id: int,
    metadata: ConnectorCredentialPairMetadata,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    try:
        return add_credential_to_connector(
            connector_id=connector_id,
            credential_id=credential_id,
            cc_pair_name=metadata.name,
            user=user,
            db_session=db_session,
        )
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Name must be unique")


@router.delete("/connector/{connector_id}/credential/{credential_id}")
def dissociate_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return remove_credential_from_connector(
        connector_id, credential_id, user, db_session
    )
