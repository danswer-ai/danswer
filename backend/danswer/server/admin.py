from typing import cast

from danswer.auth.users import current_admin_user
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import NO_AUTH_USER
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.connectors.google_drive.connector_auth import get_auth_url
from danswer.connectors.google_drive.connector_auth import get_drive_tokens
from danswer.connectors.google_drive.connector_auth import save_access_tokens
from danswer.connectors.google_drive.connector_auth import verify_csrf
from danswer.connectors.slack.config import get_slack_config
from danswer.connectors.slack.config import SlackConfig
from danswer.connectors.slack.config import update_slack_config
from danswer.db.connector import add_credential_to_connector
from danswer.db.connector import create_update_connector
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import fetch_connectors
from danswer.db.credentials import create_update_credential
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.credentials import fetch_credentials
from danswer.db.engine import get_session
from danswer.db.index_attempt import fetch_index_attempts
from danswer.db.models import User
from danswer.direct_qa.key_validation import check_openai_api_key_is_valid
from danswer.direct_qa.question_answer import get_openai_api_key
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import ApiKey
from danswer.server.models import AuthStatus
from danswer.server.models import AuthUrl
from danswer.server.models import ConnectorSnapshot
from danswer.server.models import CredentialSnapshot
from danswer.server.models import GDriveCallback
from danswer.server.models import IndexAttemptSnapshot
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin")

logger = setup_logger()


@router.get("/connectors/google-drive/check-auth", response_model=AuthStatus)
def check_drive_tokens(_: User = Depends(current_admin_user)) -> AuthStatus:
    tokens = get_drive_tokens()
    authenticated = tokens is not None
    return AuthStatus(authenticated=authenticated)


@router.get("/connectors/google-drive/authorize", response_model=AuthUrl)
def google_drive_auth(user: User = Depends(current_admin_user)) -> AuthUrl:
    user_id = str(user.id) if user else NO_AUTH_USER
    return AuthUrl(auth_url=get_auth_url(user_id))


@router.get("/connectors/google-drive/callback", status_code=201)
def google_drive_callback(
    callback: GDriveCallback = Depends(), user: User = Depends(current_admin_user)
) -> None:
    user_id = str(user.id) if user else NO_AUTH_USER
    verify_csrf(user_id, callback.state)
    return save_access_tokens(callback.code)


@router.get("/connectors/slack/config", response_model=SlackConfig)
def fetch_slack_config(_: User = Depends(current_admin_user)) -> SlackConfig:
    try:
        return get_slack_config()
    except ConfigNotFoundError:
        return SlackConfig(slack_bot_token="", workspace_id="")


@router.post("/connectors/slack/config")
def modify_slack_config(
    slack_config: SlackConfig, _: User = Depends(current_admin_user)
) -> None:
    update_slack_config(slack_config)


@router.get("/connectors/index-attempt", response_model=list[IndexAttemptSnapshot])
def list_all_index_attempts(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[IndexAttemptSnapshot]:
    index_attempts = fetch_index_attempts(db_session)
    return [
        IndexAttemptSnapshot(
            source=index_attempt.connector.source,
            input_type=index_attempt.connector.input_type,
            status=index_attempt.status,
            connector_specific_config=index_attempt.connector.connector_specific_config,
            docs_indexed=0
            if not index_attempt.document_ids
            else len(index_attempt.document_ids),
            time_created=index_attempt.time_created,
            time_updated=index_attempt.time_updated,
        )
        for index_attempt in index_attempts
    ]


@router.get(
    "/connectors/{source}/index-attempt", response_model=list[IndexAttemptSnapshot]
)
def list_index_attempts(
    source: DocumentSource,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[IndexAttemptSnapshot]:
    index_attempts = fetch_index_attempts(db_session, sources=[source])
    return [
        IndexAttemptSnapshot(
            source=index_attempt.connector.source,
            input_type=index_attempt.connector.input_type,
            status=index_attempt.status,
            connector_specific_config=index_attempt.connector.connector_specific_config,
            docs_indexed=0
            if not index_attempt.document_ids
            else len(index_attempt.document_ids),
            time_created=index_attempt.time_created,
            time_updated=index_attempt.time_updated,
        )
        for index_attempt in index_attempts
    ]


@router.get("/admin/connector", response_model=list[ConnectorSnapshot])
def get_connectors(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorSnapshot]:
    connectors = fetch_connectors(db_session)
    return [
        ConnectorSnapshot(
            id=connector.id,
            name=connector.name,
            source=connector.source,
            input_type=connector.input_type,
            connector_specific_config=connector.connector_specific_config,
            refresh_freq=connector.refresh_freq,
            time_created=connector.time_created,
            time_updated=connector.time_updated,
            disabled=connector.disabled,
        )
        for connector in connectors
    ]


@router.get("/admin/connector/{connector_id}", response_model=ConnectorSnapshot)
def get_connector_by_id(
    connector_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot:
    connector = fetch_connector_by_id(connector_id, db_session)
    return ConnectorSnapshot(
        id=connector.id,
        name=connector.name,
        source=connector.source,
        input_type=connector.input_type,
        connector_specific_config=connector.connector_specific_config,
        refresh_freq=connector.refresh_freq,
        time_created=connector.time_created,
        time_updated=connector.time_updated,
        disabled=connector.disabled,
    )


@router.put("/admin/connector/{connector_id}", response_model=ConnectorSnapshot)
def update_or_create_connector(
    connector_id: int,
    connector_data: ConnectorSnapshot,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot:
    updated_connector = create_update_connector(
        connector_id, connector_data, db_session
    )

    return ConnectorSnapshot(
        id=updated_connector.id,
        name=updated_connector.name,
        source=updated_connector.source,
        input_type=updated_connector.input_type,
        connector_specific_config=updated_connector.connector_specific_config,
        refresh_freq=updated_connector.refresh_freq,
        time_created=updated_connector.time_created,
        time_updated=updated_connector.time_updated,
        disabled=updated_connector.disabled,
    )


@router.get("/admin/credential", response_model=list[CredentialSnapshot])
def get_credentials(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[CredentialSnapshot]:
    credentials = fetch_credentials(db_session)
    return [
        CredentialSnapshot(
            id=credential.id,
            credentials=credential.credentials,
            user_id=credential.user_id,
            time_created=credential.time_created,
            time_updated=credential.time_updated,
        )
        for credential in credentials
    ]


@router.get("/admin/credential/{credential_id}", response_model=CredentialSnapshot)
def get_credential_by_id(
    credential_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> CredentialSnapshot:
    credential = fetch_credential_by_id(credential_id, db_session)
    return CredentialSnapshot(
        id=credential.id,
        credentials=credential.credentials,
        user_id=credential.user_id,
        time_created=credential.time_created,
        time_updated=credential.time_updated,
    )


@router.put("/admin/credential/{credential_id}", response_model=CredentialSnapshot)
def update_or_create_credential(
    credential_id: int,
    credential_data: CredentialSnapshot,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> CredentialSnapshot:
    updated_credential = create_update_credential(
        credential_id, credential_data, db_session
    )

    return CredentialSnapshot(
        id=updated_credential.id,
        credentials=updated_credential.credentials,
        user_id=updated_credential.user_id,
        time_created=updated_credential.time_created,
        time_updated=updated_credential.time_updated,
    )


@router.put("/connector/{connector_id}/credential/{credential_id}")
def assign_credential_to_connector(
    connector_id: int,
    credential_id: int,
    db_session: Session = Depends(get_session),
) -> None:
    add_credential_to_connector(connector_id, credential_id, db_session)


@router.head("/admin/openai-api-key/validate")
def validate_existing_openai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    try:
        openai_api_key = get_openai_api_key()
        is_valid = check_openai_api_key_is_valid(openai_api_key)
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API key provided")


@router.get("/admin/openai-api-key", response_model=ApiKey)
def get_openai_api_key_from_dynamic_config_store(
    _: User = Depends(current_admin_user),
) -> ApiKey:
    """
    NOTE: Only gets value from dynamic config store as to not expose env variables.
    """
    try:
        # only get last 4 characters of key to not expose full key
        return ApiKey(
            api_key=cast(
                str, get_dynamic_config_store().load(OPENAI_API_KEY_STORAGE_KEY)
            )[-4:]
        )
    except ConfigNotFoundError:
        raise HTTPException(status_code=404, detail="Key not found")


@router.post("/admin/openai-api-key")
def store_openai_api_key(
    request: ApiKey,
    _: User = Depends(current_admin_user),
) -> None:
    try:
        is_valid = check_openai_api_key_is_valid(request.api_key)
        if not is_valid:
            raise HTTPException(400, "Invalid API key provided")
        get_dynamic_config_store().store(OPENAI_API_KEY_STORAGE_KEY, request.api_key)
    except RuntimeError as e:
        raise HTTPException(400, str(e))


@router.delete("/admin/openai-api-key")
def delete_openai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    get_dynamic_config_store().delete(OPENAI_API_KEY_STORAGE_KEY)
