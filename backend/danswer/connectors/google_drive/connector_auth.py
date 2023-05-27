import json
from json import JSONDecodeError
from urllib.parse import parse_qs
from urllib.parse import urlparse

from danswer.configs.app_configs import WEB_DOMAIN
from danswer.db.credentials import update_credential_json
from danswer.db.models import User
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.utils.logging import setup_logger
from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from sqlalchemy.orm import Session

logger = setup_logger()

DB_CREDENTIALS_DICT_KEY = "google_drive_tokens"
CRED_KEY = "credential_id_{}"
GOOGLE_DRIVE_CRED_KEY = "google_drive_app_credential"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FRONTEND_GOOGLE_DRIVE_REDIRECT = (
    f"{WEB_DOMAIN}/admin/connectors/google-drive/auth/callback"
)


def get_drive_tokens(
    *, creds: Credentials | None = None, token_json_str: str | None = None
) -> Credentials | None:
    if creds is None and token_json_str is None:
        return None

    if token_json_str is not None:
        creds = Credentials.from_authorized_user_info(token_json_str, SCOPES)

    if not creds:
        return None
    if creds.valid:
        return creds

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            if creds.valid:
                return creds
        except Exception as e:
            logger.exception(f"Failed to refresh google drive access token due to: {e}")
            return None
    return None


def verify_csrf(credential_id: int, state: str) -> None:
    csrf = get_dynamic_config_store().load(CRED_KEY.format(str(credential_id)))
    if csrf != state:
        raise PermissionError(
            "State from Google Drive Connector callback does not match expected"
        )


def get_auth_url(
    credential_id: str,
) -> str:
    creds_str = str(get_dynamic_config_store().load(GOOGLE_DRIVE_CRED_KEY))
    credential_json = json.loads(creds_str)
    flow = InstalledAppFlow.from_client_config(
        credential_json,
        scopes=SCOPES,
        redirect_uri=FRONTEND_GOOGLE_DRIVE_REDIRECT,
    )
    auth_url, _ = flow.authorization_url(prompt="consent")

    parsed_url = urlparse(auth_url)
    params = parse_qs(parsed_url.query)
    get_dynamic_config_store().store(CRED_KEY.format(credential_id), params.get("state", [None])[0])  # type: ignore
    return str(auth_url)


def update_credential_access_tokens(
    auth_code: str,
    credential_id: int,
    user: User,
    db_session: Session,
) -> Credentials | None:
    creds_str = str(get_dynamic_config_store().load(GOOGLE_DRIVE_CRED_KEY))
    credential_json = json.loads(creds_str)
    flow = InstalledAppFlow.from_client_config(
        credential_json,
        scopes=SCOPES,
        redirect_uri=FRONTEND_GOOGLE_DRIVE_REDIRECT,
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials
    token_json_str = creds.to_json()
    new_creds_dict = {DB_CREDENTIALS_DICT_KEY: token_json_str}

    if not update_credential_json(credential_id, new_creds_dict, user, db_session):
        return None
    return creds


def upsert_google_app_cred(creds_json_str: str) -> None:
    try:
        creds = json.loads(creds_json_str)
        if "web" not in creds:
            raise ValueError(
                "Wrong Google Application type or invalid credentials provided."
            )
    except JSONDecodeError:
        raise ValueError("Provided value for Google Drive App is not valid")

    get_dynamic_config_store().store(GOOGLE_DRIVE_CRED_KEY, creds_json_str)
