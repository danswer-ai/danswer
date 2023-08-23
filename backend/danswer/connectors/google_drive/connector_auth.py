import json
from enum import Enum
from typing import cast
from urllib.parse import parse_qs
from urllib.parse import ParseResult
from urllib.parse import urlparse

from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from sqlalchemy.orm import Session

from danswer.configs.app_configs import WEB_DOMAIN
from danswer.db.credentials import update_credential_json
from danswer.db.models import User
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.server.models import GoogleAppCredentials
from danswer.utils.logger import setup_logger

logger = setup_logger()

DB_CREDENTIALS_DICT_AUTH_TYPE = "google_drive_auth_type"
DB_CREDENTIALS_DICT_TOKEN_KEY = "google_drive_tokens"
DB_CREDENTIALS_DICT_DELEGATED_USER_KEY = "google_drive_delegated_user"
CRED_KEY = "credential_id_{}"
GOOGLE_DRIVE_CRED_KEY = "google_drive_app_credential"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


class GoogleDriveAuthorizationType(str, Enum):
    AUTHORIZED_USER = "authorized_user"
    SERVICE_ACCOUNT = "service_account"


def _build_frontend_google_drive_redirect() -> str:
    return f"{WEB_DOMAIN}/admin/connectors/google-drive/auth/callback"


def get_google_drive_creds_for_authorized_user(
    token_json_str: str,
) -> OAuthCredentials | None:
    creds_json = json.loads(token_json_str)
    creds = OAuthCredentials.from_authorized_user_info(creds_json, SCOPES)
    if creds.valid:
        return creds

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            if creds.valid:
                logger.info("Refreshed Google Drive tokens.")
                return creds
        except Exception as e:
            logger.exception(f"Failed to refresh google drive access token due to: {e}")
            return None

    return None


def get_google_drive_creds_for_service_account(
    token_json_str: str,
) -> ServiceAccountCredentials | None:
    creds_json = json.loads(token_json_str)
    creds = ServiceAccountCredentials.from_service_account_info(
        creds_json, scopes=SCOPES
    )
    if not creds.valid or not creds.expired:
        creds.refresh(Request())
    return creds if creds.valid else None


def verify_csrf(credential_id: int, state: str) -> None:
    csrf = get_dynamic_config_store().load(CRED_KEY.format(str(credential_id)))
    if csrf != state:
        raise PermissionError(
            "State from Google Drive Connector callback does not match expected"
        )


def get_auth_url(credential_id: int) -> str:
    creds_str = str(get_dynamic_config_store().load(GOOGLE_DRIVE_CRED_KEY))
    credential_json = json.loads(creds_str)
    flow = InstalledAppFlow.from_client_config(
        credential_json,
        scopes=SCOPES,
        redirect_uri=_build_frontend_google_drive_redirect(),
    )
    auth_url, _ = flow.authorization_url(prompt="consent")

    parsed_url = cast(ParseResult, urlparse(auth_url))
    params = parse_qs(parsed_url.query)

    get_dynamic_config_store().store(CRED_KEY.format(credential_id), params.get("state", [None])[0])  # type: ignore
    return str(auth_url)


def update_credential_access_tokens(
    auth_code: str,
    credential_id: int,
    user: User,
    db_session: Session,
) -> OAuthCredentials | None:
    app_credentials = get_google_app_cred()
    flow = InstalledAppFlow.from_client_config(
        app_credentials.dict(),
        scopes=SCOPES,
        redirect_uri=_build_frontend_google_drive_redirect(),
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials
    token_json_str = creds.to_json()
    new_creds_dict = {DB_CREDENTIALS_DICT_TOKEN_KEY: token_json_str}

    if not update_credential_json(credential_id, new_creds_dict, user, db_session):
        return None
    return creds


def get_google_app_cred() -> GoogleAppCredentials:
    creds_str = str(get_dynamic_config_store().load(GOOGLE_DRIVE_CRED_KEY))
    return GoogleAppCredentials(**json.loads(creds_str))


def upsert_google_app_cred(app_credentials: GoogleAppCredentials) -> None:
    get_dynamic_config_store().store(GOOGLE_DRIVE_CRED_KEY, app_credentials.json())
