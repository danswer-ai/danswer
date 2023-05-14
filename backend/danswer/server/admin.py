from typing import Any

from danswer.auth.users import current_admin_user
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import NO_AUTH_USER
from danswer.connectors.factory import build_connector
from danswer.connectors.google_drive.connector_auth import get_auth_url
from danswer.connectors.google_drive.connector_auth import get_drive_tokens
from danswer.connectors.google_drive.connector_auth import save_access_tokens
from danswer.connectors.google_drive.connector_auth import verify_csrf
from danswer.connectors.models import InputType
from danswer.connectors.slack.config import get_slack_config
from danswer.connectors.slack.config import SlackConfig
from danswer.connectors.slack.config import update_slack_config
from danswer.db.index_attempt import fetch_index_attempts
from danswer.db.index_attempt import insert_index_attempt
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.db.models import User
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.models import AuthStatus
from danswer.server.models import AuthUrl
from danswer.server.models import GDriveCallback
from danswer.server.models import IndexAttemptSnapshot
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel

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


class IndexAttemptRequest(BaseModel):
    input_type: InputType = InputType.PULL
    connector_specific_config: dict[str, Any]


@router.post("/connectors/{source}/index-attempt", status_code=201)
def index(
    source: DocumentSource,
    index_attempt_request: IndexAttemptRequest,
    _: User = Depends(current_admin_user),
) -> None:
    # validate that the connector specified by the source / input_type combination
    # exists AND that the connector_specific_config is valid for that connector type
    build_connector(
        source=source,
        input_type=index_attempt_request.input_type,
        connector_specific_config=index_attempt_request.connector_specific_config,
    )

    # once validated, insert the index attempt into the database where it will
    # get picked up by a background job
    insert_index_attempt(
        index_attempt=IndexAttempt(
            source=source,
            input_type=index_attempt_request.input_type,
            connector_specific_config=index_attempt_request.connector_specific_config,
            status=IndexingStatus.NOT_STARTED,
        )
    )


class ListIndexAttemptsResponse(BaseModel):
    index_attempts: list[IndexAttemptSnapshot]


@router.get("/connectors/{source}/index-attempt")
def list_index_attempts(
    source: DocumentSource,
    _: User = Depends(current_admin_user),
) -> ListIndexAttemptsResponse:
    index_attempts = fetch_index_attempts(sources=[source])
    return ListIndexAttemptsResponse(
        index_attempts=[
            IndexAttemptSnapshot(
                connector_specific_config=index_attempt.connector_specific_config,
                status=index_attempt.status,
                time_created=index_attempt.time_created,
                time_updated=index_attempt.time_updated,
                docs_indexed=0
                if not index_attempt.document_ids
                else len(index_attempt.document_ids),
            )
            for index_attempt in index_attempts
        ]
    )
