import os
from typing import Any
from urllib.parse import parse_qs
from urllib.parse import urlparse

from danswer.configs.app_configs import GOOGLE_DRIVE_CREDENTIAL_JSON
from danswer.configs.app_configs import GOOGLE_DRIVE_TOKENS_JSON
from danswer.configs.app_configs import WEB_DOMAIN
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.utils.logging import setup_logger
from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from googleapiclient import discovery  # type: ignore

logger = setup_logger()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FRONTEND_GOOGLE_DRIVE_REDIRECT = f"{WEB_DOMAIN}/auth/connectors/google_drive/callback"


def backend_get_credentials() -> Credentials:
    """This approach does not work for the one-box builds"""
    creds = None
    if os.path.exists(GOOGLE_DRIVE_TOKENS_JSON):
        creds = Credentials.from_authorized_user_file(GOOGLE_DRIVE_TOKENS_JSON, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                GOOGLE_DRIVE_CREDENTIAL_JSON, SCOPES
            )
            creds = flow.run_local_server()

        with open(GOOGLE_DRIVE_TOKENS_JSON, "w") as token_file:
            token_file.write(creds.to_json())

    return creds


def get_drive_tokens(token_path: str = GOOGLE_DRIVE_TOKENS_JSON) -> Any:
    if not os.path.exists(token_path):
        return None

    creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds:
        return None
    if creds.valid:
        return creds

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            if creds.valid:
                with open(token_path, "w") as token_file:
                    token_file.write(creds.to_json())
                return creds
        except Exception as e:
            logger.exception(f"Failed to refresh google drive access token due to: {e}")
            return None
    return None


def verify_csrf(user_id: str, state: str) -> None:
    csrf = get_dynamic_config_store().load(user_id)
    if csrf != state:
        raise PermissionError(
            "State from Google Drive Connector callback does not match expected"
        )


def get_auth_url(
    user_id: str, credentials_file: str = GOOGLE_DRIVE_CREDENTIAL_JSON
) -> str:
    flow = InstalledAppFlow.from_client_secrets_file(
        credentials_file,
        scopes=SCOPES,
        redirect_uri=FRONTEND_GOOGLE_DRIVE_REDIRECT,
    )
    auth_url, _ = flow.authorization_url(prompt="consent")

    parsed_url = urlparse(auth_url)
    params = parse_qs(parsed_url.query)
    get_dynamic_config_store().store(user_id, params.get("state", [None])[0])  # type: ignore
    return str(auth_url)


def save_access_tokens(
    auth_code: str,
    token_path: str = GOOGLE_DRIVE_TOKENS_JSON,
    credentials_file: str = GOOGLE_DRIVE_CREDENTIAL_JSON,
) -> Any:
    flow = InstalledAppFlow.from_client_secrets_file(
        credentials_file, scopes=SCOPES, redirect_uri=FRONTEND_GOOGLE_DRIVE_REDIRECT
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials

    os.makedirs(os.path.dirname(token_path), exist_ok=True)
    with open(token_path, "w") as token_file:
        token_file.write(creds.to_json())

    if not get_drive_tokens(token_path):
        raise PermissionError("Not able to access Google Drive.")

    return creds
