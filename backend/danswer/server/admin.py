from danswer.auth.users import current_admin_user
from danswer.configs.constants import DocumentSource
from danswer.connectors.google_drive.connector_auth import get_auth_url
from danswer.connectors.google_drive.connector_auth import get_drive_tokens
from danswer.connectors.google_drive.connector_auth import get_save_access_tokens
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
from danswer.server.models import ListWebsiteIndexAttemptsResponse
from danswer.server.models import WebIndexAttemptRequest
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends


router = APIRouter(prefix="/admin")

logger = setup_logger()


@router.get("/connectors/google-drive/check-auth", response_model=AuthStatus)
def check_drive_tokens(_: User = Depends(current_admin_user)) -> AuthStatus:
    tokens = get_drive_tokens()
    authenticated = tokens is not None
    return AuthStatus(authenticated=authenticated)


@router.get("/connectors/google-drive/authorize", response_model=AuthUrl)
def google_drive_auth(_: User = Depends(current_admin_user)) -> AuthUrl:
    return AuthUrl(auth_url=get_auth_url())


@router.get("/connectors/google-drive/callback", status_code=201)
def google_drive_callback(
    callback: GDriveCallback = Depends(), _: User = Depends(current_admin_user)
) -> None:
    verify_csrf(callback.state)
    return get_save_access_tokens(callback.code)


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


@router.post("/connectors/web/index-attempt", status_code=201)
def index_website(
    web_index_attempt_request: WebIndexAttemptRequest,
    _: User = Depends(current_admin_user),
) -> None:
    index_request = IndexAttempt(
        source=DocumentSource.WEB,
        input_type=InputType.PULL,
        connector_specific_config={"url": web_index_attempt_request.url},
        status=IndexingStatus.NOT_STARTED,
    )
    insert_index_attempt(index_request)


@router.get("/connectors/web/index-attempt")
def list_website_index_attempts(
    _: User = Depends(current_admin_user),
) -> ListWebsiteIndexAttemptsResponse:
    index_attempts = fetch_index_attempts(sources=[DocumentSource.WEB])
    return ListWebsiteIndexAttemptsResponse(
        index_attempts=[
            IndexAttemptSnapshot(
                url=index_attempt.connector_specific_config["url"],
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
