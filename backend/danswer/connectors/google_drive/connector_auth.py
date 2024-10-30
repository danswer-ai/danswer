import json
from typing import cast
from urllib.parse import parse_qs
from urllib.parse import ParseResult
from urllib.parse import urlparse

from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from sqlalchemy.orm import Session

from danswer.configs.app_configs import WEB_DOMAIN
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import KV_CRED_KEY
from danswer.configs.constants import KV_GOOGLE_DRIVE_CRED_KEY
from danswer.configs.constants import KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY
from danswer.connectors.google_drive.constants import MISSING_SCOPES_ERROR_STR
from danswer.connectors.google_drive.constants import ONYX_SCOPE_INSTRUCTIONS
from danswer.db.credentials import update_credential_json
from danswer.db.models import User
from danswer.key_value_store.factory import get_kv_store
from danswer.server.documents.models import CredentialBase
from danswer.server.documents.models import GoogleAppCredentials
from danswer.server.documents.models import GoogleServiceAccountKey
from danswer.utils.logger import setup_logger

logger = setup_logger()

GOOGLE_DRIVE_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://www.googleapis.com/auth/admin.directory.group.readonly",
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
]
DB_CREDENTIALS_DICT_TOKEN_KEY = "google_drive_tokens"
DB_CREDENTIALS_PRIMARY_ADMIN_KEY = "google_drive_primary_admin"


def _build_frontend_google_drive_redirect() -> str:
    return f"{WEB_DOMAIN}/admin/connectors/google-drive/auth/callback"


def get_google_drive_creds_for_authorized_user(
    token_json_str: str, scopes: list[str]
) -> OAuthCredentials | None:
    creds_json = json.loads(token_json_str)
    creds = OAuthCredentials.from_authorized_user_info(creds_json, scopes)
    if creds.valid:
        return creds

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            if creds.valid:
                logger.notice("Refreshed Google Drive tokens.")
                return creds
        except Exception as e:
            logger.exception(f"Failed to refresh google drive access token due to: {e}")
            return None

    return None


def get_google_drive_creds(
    credentials: dict[str, str], scopes: list[str] = GOOGLE_DRIVE_SCOPES
) -> tuple[ServiceAccountCredentials | OAuthCredentials, dict[str, str] | None]:
    """Checks for two different types of credentials.
    (1) A credential which holds a token acquired via a user going thorough
    the Google OAuth flow.
    (2) A credential which holds a service account key JSON file, which
    can then be used to impersonate any user in the workspace.
    """
    oauth_creds = None
    service_creds = None
    new_creds_dict = None
    if DB_CREDENTIALS_DICT_TOKEN_KEY in credentials:
        access_token_json_str = cast(str, credentials[DB_CREDENTIALS_DICT_TOKEN_KEY])
        oauth_creds = get_google_drive_creds_for_authorized_user(
            token_json_str=access_token_json_str, scopes=scopes
        )

        # tell caller to update token stored in DB if it has changed
        # (e.g. the token has been refreshed)
        new_creds_json_str = oauth_creds.to_json() if oauth_creds else ""
        if new_creds_json_str != access_token_json_str:
            new_creds_dict = {
                DB_CREDENTIALS_DICT_TOKEN_KEY: new_creds_json_str,
                DB_CREDENTIALS_PRIMARY_ADMIN_KEY: credentials[
                    DB_CREDENTIALS_PRIMARY_ADMIN_KEY
                ],
            }

    elif KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY in credentials:
        service_account_key_json_str = credentials[KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY]
        service_account_key = json.loads(service_account_key_json_str)

        service_creds = ServiceAccountCredentials.from_service_account_info(
            service_account_key, scopes=scopes
        )

        if not service_creds.valid or not service_creds.expired:
            service_creds.refresh(Request())

        if not service_creds.valid:
            raise PermissionError(
                "Unable to access Google Drive - service account credentials are invalid."
            )

    creds: ServiceAccountCredentials | OAuthCredentials | None = (
        oauth_creds or service_creds
    )
    if creds is None:
        raise PermissionError(
            "Unable to access Google Drive - unknown credential structure."
        )

    return creds, new_creds_dict


def verify_csrf(credential_id: int, state: str) -> None:
    csrf = get_kv_store().load(KV_CRED_KEY.format(str(credential_id)))
    if csrf != state:
        raise PermissionError(
            "State from Google Drive Connector callback does not match expected"
        )


def get_auth_url(credential_id: int) -> str:
    creds_str = str(get_kv_store().load(KV_GOOGLE_DRIVE_CRED_KEY))
    credential_json = json.loads(creds_str)
    flow = InstalledAppFlow.from_client_config(
        credential_json,
        scopes=GOOGLE_DRIVE_SCOPES,
        redirect_uri=_build_frontend_google_drive_redirect(),
    )
    auth_url, _ = flow.authorization_url(prompt="consent")

    parsed_url = cast(ParseResult, urlparse(auth_url))
    params = parse_qs(parsed_url.query)

    get_kv_store().store(
        KV_CRED_KEY.format(credential_id), params.get("state", [None])[0], encrypt=True
    )  # type: ignore
    return str(auth_url)


def update_credential_access_tokens(
    auth_code: str,
    credential_id: int,
    user: User,
    db_session: Session,
) -> OAuthCredentials | None:
    app_credentials = get_google_app_cred()
    flow = InstalledAppFlow.from_client_config(
        app_credentials.model_dump(),
        scopes=GOOGLE_DRIVE_SCOPES,
        redirect_uri=_build_frontend_google_drive_redirect(),
    )
    flow.fetch_token(code=auth_code)
    creds = flow.credentials
    token_json_str = creds.to_json()

    # Get user email from Google API so we know who
    # the primary admin is for this connector
    try:
        admin_service = build("drive", "v3", credentials=creds)
        user_info = (
            admin_service.about()
            .get(
                fields="user(emailAddress)",
            )
            .execute()
        )
        email = user_info.get("user", {}).get("emailAddress")
    except Exception as e:
        if MISSING_SCOPES_ERROR_STR in str(e):
            raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
        raise e

    new_creds_dict = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: token_json_str,
        DB_CREDENTIALS_PRIMARY_ADMIN_KEY: email,
    }

    if not update_credential_json(credential_id, new_creds_dict, user, db_session):
        return None
    return creds


def build_service_account_creds(
    source: DocumentSource,
    primary_admin_email: str | None = None,
) -> CredentialBase:
    service_account_key = get_service_account_key()

    credential_dict = {
        KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY: service_account_key.json(),
    }
    if primary_admin_email:
        credential_dict[DB_CREDENTIALS_PRIMARY_ADMIN_KEY] = primary_admin_email

    return CredentialBase(
        credential_json=credential_dict,
        admin_public=True,
        source=DocumentSource.GOOGLE_DRIVE,
    )


def get_google_app_cred() -> GoogleAppCredentials:
    creds_str = str(get_kv_store().load(KV_GOOGLE_DRIVE_CRED_KEY))
    return GoogleAppCredentials(**json.loads(creds_str))


def upsert_google_app_cred(app_credentials: GoogleAppCredentials) -> None:
    get_kv_store().store(KV_GOOGLE_DRIVE_CRED_KEY, app_credentials.json(), encrypt=True)


def delete_google_app_cred() -> None:
    get_kv_store().delete(KV_GOOGLE_DRIVE_CRED_KEY)


def get_service_account_key() -> GoogleServiceAccountKey:
    creds_str = str(get_kv_store().load(KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY))
    return GoogleServiceAccountKey(**json.loads(creds_str))


def upsert_service_account_key(service_account_key: GoogleServiceAccountKey) -> None:
    get_kv_store().store(
        KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY, service_account_key.json(), encrypt=True
    )


def delete_service_account_key() -> None:
    get_kv_store().delete(KV_GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY)
