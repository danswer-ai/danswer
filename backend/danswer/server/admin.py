from collections import defaultdict
from typing import cast

from danswer.auth.users import current_admin_user
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.connectors.google_drive.connector_auth import get_auth_url
from danswer.connectors.google_drive.connector_auth import get_drive_tokens
from danswer.connectors.google_drive.connector_auth import (
    update_credential_access_tokens,
)
from danswer.connectors.google_drive.connector_auth import upsert_google_app_cred
from danswer.connectors.google_drive.connector_auth import verify_csrf
from danswer.connectors.slack.config import get_slack_config
from danswer.connectors.slack.config import SlackConfig
from danswer.connectors.slack.config import update_slack_config
from danswer.db.connector import add_credential_to_connector
from danswer.db.connector import connector_not_found_response
from danswer.db.connector import create_connector
from danswer.db.connector import delete_connector
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import fetch_connectors
from danswer.db.connector import fetch_latest_index_attempt_by_connector
from danswer.db.connector import fetch_latest_index_attempts_by_status
from danswer.db.connector import get_connector_credential_ids
from danswer.db.connector import remove_credential_from_connector
from danswer.db.connector import update_connector
from danswer.db.credentials import create_credential
from danswer.db.credentials import credential_not_found_response
from danswer.db.credentials import delete_credential
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.credentials import fetch_credentials
from danswer.db.credentials import update_credential
from danswer.db.engine import get_session
from danswer.db.index_attempt import create_index_attempt
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.db.models import User
from danswer.direct_qa.key_validation import check_openai_api_key_is_valid
from danswer.direct_qa.question_answer import get_openai_api_key
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import ApiKey
from danswer.server.models import AuthStatus
from danswer.server.models import AuthUrl
from danswer.server.models import ConnectorBase
from danswer.server.models import ConnectorIndexingStatus
from danswer.server.models import ConnectorSnapshot
from danswer.server.models import CredentialBase
from danswer.server.models import CredentialSnapshot
from danswer.server.models import DataRequest
from danswer.server.models import GDriveCallback
from danswer.server.models import IndexAttemptSnapshot
from danswer.server.models import ObjectCreationIdResponse
from danswer.server.models import RunConnectorRequest
from danswer.server.models import StatusResponse
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin")

logger = setup_logger()


@router.put("/connector/google-drive/setup")
def update_google_app_credentials(
    cred_json: DataRequest, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_google_app_cred(cred_json.data)
    except ValueError as e:
        return StatusResponse(success=False, message=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google App Credentials"
    )


@router.get("/connector/google-drive/check-auth", response_model=AuthStatus)
def check_drive_tokens(_: User = Depends(current_admin_user)) -> AuthStatus:
    tokens = get_drive_tokens()
    authenticated = tokens is not None
    return AuthStatus(authenticated=authenticated)


@router.get("/connector/google-drive/authorize/{credential_id}", response_model=AuthUrl)
def google_drive_auth(
    credential_id: str, _: User = Depends(current_admin_user)
) -> AuthUrl:
    return AuthUrl(auth_url=get_auth_url(credential_id))


@router.get("/connector/google-drive/callback/{credential_id}", status_code=201)
def google_drive_callback(
    credential_id: str,
    callback: GDriveCallback = Depends(),
    user: User = Depends(current_admin_user),
) -> None:
    verify_csrf(credential_id, callback.state)
    return update_credential_access_tokens(callback.code, credential_id, user)


@router.get("/connector/slack/config", response_model=SlackConfig)
def fetch_slack_config(_: User = Depends(current_admin_user)) -> SlackConfig:
    try:
        return get_slack_config()
    except ConfigNotFoundError:
        return SlackConfig(slack_bot_token="", workspace_id="")


@router.post("/connector/slack/config")
def modify_slack_config(
    slack_config: SlackConfig, _: User = Depends(current_admin_user)
) -> None:
    update_slack_config(slack_config)


@router.get("/latest-index-attempt", response_model=list[IndexAttemptSnapshot])
def list_all_index_attempts(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[IndexAttemptSnapshot]:
    index_attempts = fetch_latest_index_attempt_by_connector(db_session)
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


@router.get("/latest-index-attempt/{source}", response_model=list[IndexAttemptSnapshot])
def list_index_attempts(
    source: DocumentSource,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[IndexAttemptSnapshot]:
    index_attempts = fetch_latest_index_attempt_by_connector(db_session, source=source)
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


@router.get("/connector", response_model=list[ConnectorSnapshot])
def get_connectors(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorSnapshot]:
    connectors = fetch_connectors(db_session)
    return [
        ConnectorSnapshot.from_connector_db_model(connector) for connector in connectors
    ]


@router.get("/connector/indexing-status")
def get_connectors_indexing_status(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorIndexingStatus]:
    connector_id_to_connector = {
        connector.id: connector for connector in fetch_connectors(db_session)
    }
    index_attempts = fetch_latest_index_attempts_by_status(db_session)
    connector_to_index_attempts: dict[int, list[IndexAttempt]] = defaultdict(list)
    for index_attempt in index_attempts:
        connector_to_index_attempts[index_attempt.connector_id].append(index_attempt)

    indexing_statuses: list[ConnectorIndexingStatus] = []
    for connector_id, index_attempts in connector_to_index_attempts.items():
        # NOTE: index_attempts is guaranteed to be length > 0
        connector = connector_id_to_connector[connector_id]
        index_attempts_sorted = sorted(index_attempts, key=lambda x: x.time_updated)
        successful_index_attempts_sorted = [
            index_attempt
            for index_attempt in index_attempts_sorted
            if index_attempt.status == IndexingStatus.SUCCESS
        ]
        indexing_statuses.append(
            ConnectorIndexingStatus(
                connector=ConnectorSnapshot.from_connector_db_model(connector),
                last_status=index_attempts_sorted[0].status,
                last_success=successful_index_attempts_sorted[0].time_updated
                if successful_index_attempts_sorted
                else None,
                docs_indexed=len(successful_index_attempts_sorted[0].document_ids)
                if successful_index_attempts_sorted
                else 0,
            ),
        )

    # add in the connector that haven't started indexing yet
    for connector in connector_id_to_connector.values():
        if connector.id not in connector_to_index_attempts:
            indexing_statuses.append(
                ConnectorIndexingStatus(
                    connector=ConnectorSnapshot.from_connector_db_model(connector),
                    last_status=IndexingStatus.NOT_STARTED,
                    last_success=None,
                    docs_indexed=0,
                ),
            )

    return indexing_statuses


@router.get(
    "/connector/{connector_id}",
    response_model=ConnectorSnapshot | StatusResponse[int],
)
def get_connector_by_id(
    connector_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        return connector_not_found_response(connector_id)

    return ConnectorSnapshot(
        id=connector.id,
        name=connector.name,
        source=connector.source,
        input_type=connector.input_type,
        connector_specific_config=connector.connector_specific_config,
        refresh_freq=connector.refresh_freq,
        credential_ids=[
            association.credential.id for association in connector.credentials
        ],
        time_created=connector.time_created,
        time_updated=connector.time_updated,
        disabled=connector.disabled,
    )


@router.post("/connector", response_model=ObjectCreationIdResponse)
def create_connector_from_model(
    connector_info: ConnectorBase,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    return create_connector(connector_info, db_session)


@router.patch(
    "/connector/{connector_id}",
    response_model=ConnectorSnapshot | StatusResponse[int],
)
def update_connector_from_model(
    connector_id: int,
    connector_data: ConnectorBase,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    updated_connector = update_connector(connector_id, connector_data, db_session)
    if updated_connector is None:
        return connector_not_found_response(connector_id)

    return ConnectorSnapshot(
        id=updated_connector.id,
        name=updated_connector.name,
        source=updated_connector.source,
        input_type=updated_connector.input_type,
        connector_specific_config=updated_connector.connector_specific_config,
        refresh_freq=updated_connector.refresh_freq,
        credential_ids=[
            association.credential.id for association in updated_connector.credentials
        ],
        time_created=updated_connector.time_created,
        time_updated=updated_connector.time_updated,
        disabled=updated_connector.disabled,
    )


@router.delete("/connector/{connector_id}", response_model=StatusResponse[int])
def delete_connector_by_id(
    connector_id: int,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return delete_connector(connector_id, db_session)


@router.get("/credential", response_model=list[CredentialSnapshot])
def get_credentials(
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[CredentialSnapshot]:
    credentials = fetch_credentials(user, db_session)
    return [
        CredentialSnapshot(
            id=credential.id,
            credential_json=credential.credential_json,
            user_id=credential.user_id,
            public_doc=credential.public_doc,
            time_created=credential.time_created,
            time_updated=credential.time_updated,
        )
        for credential in credentials
    ]


@router.get(
    "/credential/{credential_id}",
    response_model=CredentialSnapshot | StatusResponse[int],
)
def get_credential_by_id(
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> CredentialSnapshot | StatusResponse[int]:
    credential = fetch_credential_by_id(credential_id, user, db_session)
    if credential is None:
        return StatusResponse(
            success=False,
            message="Credential does not exit or does not belong to user",
            data=credential_id,
        )

    return CredentialSnapshot(
        id=credential.id,
        credential_json=credential.credential_json,
        user_id=credential.user_id,
        public_doc=credential.public_doc,
        time_created=credential.time_created,
        time_updated=credential.time_updated,
    )


@router.post("/credential", response_model=ObjectCreationIdResponse)
def create_credential_from_model(
    connector_info: CredentialBase,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    return create_credential(connector_info, user, db_session)


@router.patch(
    "/credential/{credential_id}",
    response_model=CredentialSnapshot | StatusResponse[int],
)
def update_credential_from_model(
    credential_id: int,
    credential_data: CredentialBase,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> CredentialSnapshot | StatusResponse[int]:
    updated_credential = update_credential(
        credential_id, credential_data, user, db_session
    )
    if updated_credential is None:
        return credential_not_found_response(credential_id)

    return CredentialSnapshot(
        id=updated_credential.id,
        credential_json=updated_credential.credential_json,
        user_id=updated_credential.user_id,
        public_doc=updated_credential.public_doc,
        time_created=updated_credential.time_created,
        time_updated=updated_credential.time_updated,
    )


@router.delete("/credential/{credential_id}", response_model=StatusResponse[int])
def delete_credential_by_id(
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    delete_credential(credential_id, user, db_session)
    return StatusResponse(
        success=True, message="Credential deleted successfully", data=credential_id
    )


@router.put("/connector/{connector_id}/credential/{credential_id}")
def associate_credential_to_connector(
    connector_id: int,
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return add_credential_to_connector(connector_id, credential_id, user, db_session)


@router.delete("/connector/{connector_id}/credential/{credential_id}")
def dissociate_credential_from_connector(
    connector_id: int,
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    return remove_credential_from_connector(
        connector_id, credential_id, user, db_session
    )


@router.post("/connector/run-once")
def connector_run_once(
    run_info: RunConnectorRequest,
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[list[int]]:
    connector_id = run_info.connector_id
    specified_credential_ids = run_info.credential_ids
    try:
        possible_credential_ids = get_connector_credential_ids(
            run_info.connector_id, db_session
        )
    except ValueError:
        return StatusResponse(
            success=False,
            message=f"Connector by id {connector_id} does not exist.",
        )

    if not specified_credential_ids:
        credential_ids = possible_credential_ids
    else:
        if set(specified_credential_ids).issubset(set(possible_credential_ids)):
            credential_ids = specified_credential_ids
        else:
            return StatusResponse(
                success=False,
                message=f"Not all specified credentials are associated with connector",
            )

    if not credential_ids:
        return StatusResponse(
            success=False,
            message=f"Connector has no valid credentials, cannot create index attempts.",
        )

    index_attempt_ids = [
        create_index_attempt(run_info.connector_id, credential_id, db_session)
        for credential_id in credential_ids
    ]
    return StatusResponse(
        success=True,
        message=f"Successfully created {len(index_attempt_ids)} index attempts",
        data=index_attempt_ids,
    )


@router.head("/openai-api-key/validate")
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


@router.get("/openai-api-key", response_model=ApiKey)
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


@router.post("/openai-api-key")
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


@router.delete("/openai-api-key")
def delete_openai_api_key(
    _: User = Depends(current_admin_user),
) -> None:
    get_dynamic_config_store().delete(OPENAI_API_KEY_STORAGE_KEY)
