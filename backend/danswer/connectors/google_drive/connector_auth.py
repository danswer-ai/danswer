import json
import os
from json import JSONDecodeError
from typing import Any
from urllib.parse import parse_qs
from urllib.parse import urlparse

from danswer.configs.app_configs import GOOGLE_DRIVE_CREDENTIAL_JSON
from danswer.configs.app_configs import GOOGLE_DRIVE_TOKENS_JSON
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.db.models import User
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.utils.logging import setup_logger
from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore

logger = setup_logger()

CRED_KEY = "credential_id_{}"
GOOGLE_DRIVE_CRED_KEY = "google_drive_app_credential"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FRONTEND_GOOGLE_DRIVE_REDIRECT = (
    f"{WEB_DOMAIN}/admin/connectors/google-drive/auth/callback"
)


# TODO this doesn't work for reasons unknown
def get_drive_tokens(token_json_str: str) -> Any:
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


def verify_csrf(credential_id: str, state: str) -> None:
    csrf = get_dynamic_config_store().load(CRED_KEY.format(credential_id))
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
    credential_id: str,
    user: User,
) -> Any:
    creds_str = str(get_dynamic_config_store().load(GOOGLE_DRIVE_CRED_KEY))
    credential_json = json.loads(creds_str)
    flow = InstalledAppFlow.from_client_config(
        credential_json,
        scopes=SCOPES,
        redirect_uri=FRONTEND_GOOGLE_DRIVE_REDIRECT,
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials

    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    with open(token_path, "w+") as token_file:
        token_file.write(creds.to_json())

    if not get_drive_tokens(token_path):
        raise PermissionError("Not able to access Google Drive.")

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
