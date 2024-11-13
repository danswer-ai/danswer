from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from enmedd.auth.users import current_workspace_admin_user
from enmedd.background.celery.celery_app import celery_app
from enmedd.configs.app_configs import GENERATIVE_MODEL_ACCESS_CHECK_FREQ
from enmedd.configs.constants import DocumentSource
from enmedd.configs.constants import EnmeddCeleryPriority
from enmedd.configs.constants import KV_GEN_AI_KEY_CHECK_TIME
from enmedd.db.connector_credential_pair import get_connector_credential_pair
from enmedd.db.connector_credential_pair import (
    update_connector_credential_pair_from_id,
)
from enmedd.db.deletion_attempt import check_deletion_attempt_is_allowed
from enmedd.db.engine import get_session
from enmedd.db.enums import ConnectorCredentialPairStatus
from enmedd.db.feedback import fetch_docs_ranked_by_boost
from enmedd.db.feedback import update_document_boost
from enmedd.db.feedback import update_document_hidden
from enmedd.db.index_attempt import cancel_indexing_attempts_for_ccpair
from enmedd.db.models import User
from enmedd.document_index.document_index_utils import get_both_index_names
from enmedd.document_index.factory import get_default_document_index
from enmedd.file_store.file_store import get_default_file_store
from enmedd.key_value_store.factory import get_kv_store
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.llm.factory import get_default_llms
from enmedd.llm.utils import test_llm
from enmedd.server.documents.models import ConnectorCredentialPairIdentifier
from enmedd.server.manage.models import BoostDoc
from enmedd.server.manage.models import BoostUpdateRequest
from enmedd.server.manage.models import HiddenUpdateRequest
from enmedd.server.models import StatusResponse
from enmedd.utils.logger import setup_logger

router = APIRouter(prefix="/manage")
logger = setup_logger()

"""Admin only API endpoints"""


@router.get("/admin/doc-boosts")
def get_most_boosted_docs(
    ascending: bool,
    limit: int,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> list[BoostDoc]:
    boost_docs = fetch_docs_ranked_by_boost(
        ascending=ascending,
        limit=limit,
        db_session=db_session,
        user=user,
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
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    update_document_boost(
        db_session=db_session,
        document_id=boost_update.document_id,
        boost=boost_update.boost,
        user=user,
    )
    return StatusResponse(success=True, message="Updated document boost")


@router.post("/admin/doc-hidden")
def document_hidden_update(
    hidden_update: HiddenUpdateRequest,
    user: User | None = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    curr_ind_name, sec_ind_name = get_both_index_names(db_session)
    document_index = get_default_document_index(
        primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
    )

    update_document_hidden(
        db_session=db_session,
        document_id=hidden_update.document_id,
        hidden=hidden_update.hidden,
        document_index=document_index,
        user=user,
    )
    return StatusResponse(success=True, message="Updated document boost")


@router.get("/admin/genai-api-key/validate")
def validate_existing_genai_api_key(
    _: User = Depends(current_workspace_admin_user),
) -> None:
    # Only validate every so often
    kv_store = get_kv_store()
    curr_time = datetime.now(tz=timezone.utc)
    try:
        last_check = datetime.fromtimestamp(
            cast(float, kv_store.load(KV_GEN_AI_KEY_CHECK_TIME)), tz=timezone.utc
        )
        check_freq_sec = timedelta(seconds=GENERATIVE_MODEL_ACCESS_CHECK_FREQ)
        if curr_time - last_check < check_freq_sec:
            return
    except KvKeyNotFoundError:
        # First time checking the key, nothing unusual
        pass

    try:
        llm, __ = get_default_llms(timeout=10)
    except ValueError:
        raise HTTPException(status_code=404, detail="LLM not setup")

    error = test_llm(llm)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Mark check as successful
    curr_time = datetime.now(tz=timezone.utc)
    kv_store.store(KV_GEN_AI_KEY_CHECK_TIME, curr_time.timestamp())


@router.post("/admin/deletion-attempt")
def create_deletion_attempt_for_connector_id(
    connector_credential_pair_identifier: ConnectorCredentialPairIdentifier,
    user: User = Depends(current_workspace_admin_user),
    db_session: Session = Depends(get_session),
) -> None:
    connector_id = connector_credential_pair_identifier.connector_id
    credential_id = connector_credential_pair_identifier.credential_id

    cc_pair = get_connector_credential_pair(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
        user=user,
        get_editable=True,
    )
    if cc_pair is None:
        error = (
            f"Connector with ID '{connector_id}' and credential ID "
            f"'{credential_id}' does not exist. Has it already been deleted?"
        )
        logger.error(error)
        raise HTTPException(
            status_code=404,
            detail=error,
        )

    # Cancel any scheduled indexing attempts
    cancel_indexing_attempts_for_ccpair(
        cc_pair_id=cc_pair.id, db_session=db_session, include_secondary_index=True
    )

    # Check if the deletion attempt should be allowed
    deletion_attempt_disallowed_reason = check_deletion_attempt_is_allowed(
        connector_credential_pair=cc_pair, db_session=db_session
    )
    if deletion_attempt_disallowed_reason:
        raise HTTPException(
            status_code=400,
            detail=deletion_attempt_disallowed_reason,
        )

    # mark as deleting
    update_connector_credential_pair_from_id(
        db_session=db_session,
        cc_pair_id=cc_pair.id,
        status=ConnectorCredentialPairStatus.DELETING,
    )

    db_session.commit()

    # run the beat task to pick up this deletion from the db immediately
    celery_app.send_task(
        "check_for_connector_deletion_task",
        priority=EnmeddCeleryPriority.HIGH,
    )

    if cc_pair.connector.source == DocumentSource.FILE:
        connector = cc_pair.connector
        file_store = get_default_file_store(db_session)
        for file_name in connector.connector_specific_config.get("file_locations", []):
            file_store.delete_file(file_name)