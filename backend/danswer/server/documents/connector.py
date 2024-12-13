import os
import uuid
from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import Request
from fastapi import Response
from fastapi import UploadFile
from google.oauth2.credentials import Credentials  # type: ignore
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_curator_or_admin_user
from danswer.auth.users import current_user
from danswer.background.celery.celery_utils import get_deletion_attempt_snapshot
from danswer.background.celery.versioned_apps.primary import app as primary_app
from danswer.configs.app_configs import ENABLED_CONNECTOR_TYPES
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerCeleryTask
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import FileOrigin
from danswer.connectors.google_utils.google_auth import (
    get_google_oauth_creds,
)
from danswer.connectors.google_utils.google_kv import (
    build_service_account_creds,
)
from danswer.connectors.google_utils.google_kv import (
    delete_google_app_cred,
)
from danswer.connectors.google_utils.google_kv import (
    delete_service_account_key,
)
from danswer.connectors.google_utils.google_kv import get_auth_url
from danswer.connectors.google_utils.google_kv import (
    get_google_app_cred,
)
from danswer.connectors.google_utils.google_kv import (
    get_service_account_key,
)
from danswer.connectors.google_utils.google_kv import (
    update_credential_access_tokens,
)
from danswer.connectors.google_utils.google_kv import (
    upsert_google_app_cred,
)
from danswer.connectors.google_utils.google_kv import (
    upsert_service_account_key,
)
from danswer.connectors.google_utils.google_kv import verify_csrf
from danswer.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_DICT_TOKEN_KEY,
)
from danswer.connectors.google_utils.shared_constants import (
    GoogleOAuthAuthenticationMethod,
)
from danswer.db.connector import create_connector
from danswer.db.connector import delete_connector
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import fetch_connectors
from danswer.db.connector import get_connector_credential_ids
from danswer.db.connector import mark_ccpair_with_indexing_trigger
from danswer.db.connector import update_connector
from danswer.db.connector_credential_pair import add_credential_to_connector
from danswer.db.connector_credential_pair import get_cc_pair_groups_for_ids
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.credentials import cleanup_gmail_credentials
from danswer.db.credentials import cleanup_google_drive_credentials
from danswer.db.credentials import create_credential
from danswer.db.credentials import delete_service_account_credentials
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.document import get_document_counts_for_cc_pairs
from danswer.db.engine import get_current_tenant_id
from danswer.db.engine import get_session
from danswer.db.enums import AccessType
from danswer.db.enums import IndexingMode
from danswer.db.index_attempt import get_index_attempts_for_cc_pair
from danswer.db.index_attempt import get_latest_index_attempt_for_cc_pair_id
from danswer.db.index_attempt import get_latest_index_attempts
from danswer.db.index_attempt import get_latest_index_attempts_by_status
from danswer.db.models import IndexingStatus
from danswer.db.models import SearchSettings
from danswer.db.models import User
from danswer.db.search_settings import get_current_search_settings
from danswer.db.search_settings import get_secondary_search_settings
from danswer.file_processing.extract_file_text import convert_docx_to_txt
from danswer.file_store.file_store import get_default_file_store
from danswer.key_value_store.interface import KvKeyNotFoundError
from danswer.redis.redis_connector import RedisConnector
from danswer.redis.redis_connector_index import RedisConnectorIndex
from danswer.redis.redis_pool import get_redis_client
from danswer.server.documents.models import AuthStatus
from danswer.server.documents.models import AuthUrl
from danswer.server.documents.models import ConnectorBackgroundIndexingStatus
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.server.documents.models import ConnectorIndexingStatus
from danswer.server.documents.models import ConnectorSnapshot
from danswer.server.documents.models import ConnectorUpdateRequest
from danswer.server.documents.models import CredentialBase
from danswer.server.documents.models import CredentialSnapshot
from danswer.server.documents.models import FailedConnectorIndexingStatus
from danswer.server.documents.models import FileUploadResponse
from danswer.server.documents.models import GDriveCallback
from danswer.server.documents.models import GmailCallback
from danswer.server.documents.models import GoogleAppCredentials
from danswer.server.documents.models import GoogleServiceAccountCredentialRequest
from danswer.server.documents.models import GoogleServiceAccountKey
from danswer.server.documents.models import IndexAttemptSnapshot
from danswer.server.documents.models import ObjectCreationIdResponse
from danswer.server.documents.models import RunConnectorRequest
from danswer.server.models import StatusResponse
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import fetch_ee_implementation_or_noop

logger = setup_logger()

_GMAIL_CREDENTIAL_ID_COOKIE_NAME = "gmail_credential_id"
_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME = "google_drive_credential_id"


router = APIRouter(prefix="/manage")


"""Admin only API endpoints"""


@router.get("/admin/connector/gmail/app-credential")
def check_google_app_gmail_credentials_exist(
    _: User = Depends(current_curator_or_admin_user),
) -> dict[str, str]:
    try:
        return {"client_id": get_google_app_cred(DocumentSource.GMAIL).web.client_id}
    except KvKeyNotFoundError:
        raise HTTPException(status_code=404, detail="Google App Credentials not found")


@router.put("/admin/connector/gmail/app-credential")
def upsert_google_app_gmail_credentials(
    app_credentials: GoogleAppCredentials, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_google_app_cred(app_credentials, DocumentSource.GMAIL)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google App Credentials"
    )


@router.delete("/admin/connector/gmail/app-credential")
def delete_google_app_gmail_credentials(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    try:
        delete_google_app_cred(DocumentSource.GMAIL)
        cleanup_gmail_credentials(db_session=db_session)
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google App Credentials"
    )


@router.get("/admin/connector/google-drive/app-credential")
def check_google_app_credentials_exist(
    _: User = Depends(current_curator_or_admin_user),
) -> dict[str, str]:
    try:
        return {
            "client_id": get_google_app_cred(DocumentSource.GOOGLE_DRIVE).web.client_id
        }
    except KvKeyNotFoundError:
        raise HTTPException(status_code=404, detail="Google App Credentials not found")


@router.put("/admin/connector/google-drive/app-credential")
def upsert_google_app_credentials(
    app_credentials: GoogleAppCredentials, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_google_app_cred(app_credentials, DocumentSource.GOOGLE_DRIVE)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google App Credentials"
    )


@router.delete("/admin/connector/google-drive/app-credential")
def delete_google_app_credentials(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    try:
        delete_google_app_cred(DocumentSource.GOOGLE_DRIVE)
        cleanup_google_drive_credentials(db_session=db_session)
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google App Credentials"
    )


@router.get("/admin/connector/gmail/service-account-key")
def check_google_service_gmail_account_key_exist(
    _: User = Depends(current_curator_or_admin_user),
) -> dict[str, str]:
    try:
        return {
            "service_account_email": get_service_account_key(
                DocumentSource.GMAIL
            ).client_email
        }
    except KvKeyNotFoundError:
        raise HTTPException(
            status_code=404, detail="Google Service Account Key not found"
        )


@router.put("/admin/connector/gmail/service-account-key")
def upsert_google_service_gmail_account_key(
    service_account_key: GoogleServiceAccountKey, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_service_account_key(service_account_key, DocumentSource.GMAIL)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google Service Account Key"
    )


@router.delete("/admin/connector/gmail/service-account-key")
def delete_google_service_gmail_account_key(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    try:
        delete_service_account_key(DocumentSource.GMAIL)
        cleanup_gmail_credentials(db_session=db_session)
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google Service Account Key"
    )


@router.get("/admin/connector/google-drive/service-account-key")
def check_google_service_account_key_exist(
    _: User = Depends(current_curator_or_admin_user),
) -> dict[str, str]:
    try:
        return {
            "service_account_email": get_service_account_key(
                DocumentSource.GOOGLE_DRIVE
            ).client_email
        }
    except KvKeyNotFoundError:
        raise HTTPException(
            status_code=404, detail="Google Service Account Key not found"
        )


@router.put("/admin/connector/google-drive/service-account-key")
def upsert_google_service_account_key(
    service_account_key: GoogleServiceAccountKey, _: User = Depends(current_admin_user)
) -> StatusResponse:
    try:
        upsert_service_account_key(service_account_key, DocumentSource.GOOGLE_DRIVE)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully saved Google Service Account Key"
    )


@router.delete("/admin/connector/google-drive/service-account-key")
def delete_google_service_account_key(
    _: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    try:
        delete_service_account_key(DocumentSource.GOOGLE_DRIVE)
        cleanup_google_drive_credentials(db_session=db_session)
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StatusResponse(
        success=True, message="Successfully deleted Google Service Account Key"
    )


@router.put("/admin/connector/google-drive/service-account-credential")
def upsert_service_account_credential(
    service_account_credential_request: GoogleServiceAccountCredentialRequest,
    user: User | None = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    """Special API which allows the creation of a credential for a service account.
    Combines the input with the saved service account key to create an entry in the
    `Credential` table."""
    try:
        credential_base = build_service_account_creds(
            DocumentSource.GOOGLE_DRIVE,
            primary_admin_email=service_account_credential_request.google_primary_admin,
            name="Service Account (uploaded)",
        )
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # first delete all existing service account credentials
    delete_service_account_credentials(user, db_session, DocumentSource.GOOGLE_DRIVE)
    # `user=None` since this credential is not a personal credential
    credential = create_credential(
        credential_data=credential_base,
        user=user,
        db_session=db_session,
    )
    return ObjectCreationIdResponse(id=credential.id)


@router.put("/admin/connector/gmail/service-account-credential")
def upsert_gmail_service_account_credential(
    service_account_credential_request: GoogleServiceAccountCredentialRequest,
    user: User | None = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    """Special API which allows the creation of a credential for a service account.
    Combines the input with the saved service account key to create an entry in the
    `Credential` table."""
    try:
        credential_base = build_service_account_creds(
            DocumentSource.GMAIL,
            primary_admin_email=service_account_credential_request.google_primary_admin,
        )
    except KvKeyNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # first delete all existing service account credentials
    delete_service_account_credentials(user, db_session, DocumentSource.GMAIL)
    # `user=None` since this credential is not a personal credential
    credential = create_credential(
        credential_data=credential_base, user=user, db_session=db_session
    )
    return ObjectCreationIdResponse(id=credential.id)


@router.get("/admin/connector/google-drive/check-auth/{credential_id}")
def check_drive_tokens(
    credential_id: int,
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> AuthStatus:
    db_credentials = fetch_credential_by_id(credential_id, user, db_session)
    if (
        not db_credentials
        or DB_CREDENTIALS_DICT_TOKEN_KEY not in db_credentials.credential_json
    ):
        return AuthStatus(authenticated=False)
    token_json_str = str(db_credentials.credential_json[DB_CREDENTIALS_DICT_TOKEN_KEY])
    google_drive_creds = get_google_oauth_creds(
        token_json_str=token_json_str,
        source=DocumentSource.GOOGLE_DRIVE,
    )
    if google_drive_creds is None:
        return AuthStatus(authenticated=False)
    return AuthStatus(authenticated=True)


@router.post("/admin/connector/file/upload")
def upload_files(
    files: list[UploadFile],
    _: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> FileUploadResponse:
    for file in files:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File name cannot be empty")
    try:
        file_store = get_default_file_store(db_session)
        deduped_file_paths = []
        for file in files:
            file_path = os.path.join(str(uuid.uuid4()), cast(str, file.filename))
            deduped_file_paths.append(file_path)
            file_store.save_file(
                file_name=file_path,
                content=file.file,
                display_name=file.filename,
                file_origin=FileOrigin.CONNECTOR,
                file_type=file.content_type or "text/plain",
            )

            if file.content_type and file.content_type.startswith(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ):
                convert_docx_to_txt(file, file_store, file_path)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return FileUploadResponse(file_paths=deduped_file_paths)


# Retrieves most recent failure cases for connectors that are currently failing
@router.get("/admin/connector/failed-indexing-status")
def get_currently_failed_indexing_status(
    secondary_index: bool = False,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    get_editable: bool = Query(
        False, description="If true, return editable document sets"
    ),
) -> list[FailedConnectorIndexingStatus]:
    # Get the latest failed indexing attempts
    latest_failed_indexing_attempts = get_latest_index_attempts_by_status(
        secondary_index=secondary_index,
        db_session=db_session,
        status=IndexingStatus.FAILED,
    )

    # Get the latest successful indexing attempts
    latest_successful_indexing_attempts = get_latest_index_attempts_by_status(
        secondary_index=secondary_index,
        db_session=db_session,
        status=IndexingStatus.SUCCESS,
    )

    # Get all connector credential pairs
    cc_pairs = get_connector_credential_pairs(
        db_session=db_session,
        user=user,
        get_editable=get_editable,
    )

    # Filter out failed attempts that have a more recent successful attempt
    filtered_failed_attempts = [
        failed_attempt
        for failed_attempt in latest_failed_indexing_attempts
        if not any(
            success_attempt.connector_credential_pair_id
            == failed_attempt.connector_credential_pair_id
            and success_attempt.time_updated > failed_attempt.time_updated
            for success_attempt in latest_successful_indexing_attempts
        )
    ]

    # Filter cc_pairs to include only those with failed attempts
    cc_pairs = [
        cc_pair
        for cc_pair in cc_pairs
        if any(
            attempt.connector_credential_pair == cc_pair
            for attempt in filtered_failed_attempts
        )
    ]

    # Create a mapping of cc_pair_id to its latest failed index attempt
    cc_pair_to_latest_index_attempt = {
        attempt.connector_credential_pair_id: attempt
        for attempt in filtered_failed_attempts
    }

    indexing_statuses = []

    for cc_pair in cc_pairs:
        # Skip DefaultCCPair
        if cc_pair.name == "DefaultCCPair":
            continue

        latest_index_attempt = cc_pair_to_latest_index_attempt.get(cc_pair.id)

        indexing_statuses.append(
            FailedConnectorIndexingStatus(
                cc_pair_id=cc_pair.id,
                name=cc_pair.name,
                error_msg=(
                    latest_index_attempt.error_msg if latest_index_attempt else None
                ),
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
                is_deletable=check_deletion_attempt_is_allowed(
                    connector_credential_pair=cc_pair,
                    db_session=db_session,
                    allow_scheduled=True,
                )
                is None,
            )
        )

    return indexing_statuses


@router.get("/admin/connector")
def get_connectors_by_credential(
    _: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    credential: int | None = None,
) -> list[ConnectorSnapshot]:
    """Get a list of connectors. Allow filtering by a specific credential id."""

    connectors = fetch_connectors(db_session)

    filtered_connectors = []
    for connector in connectors:
        if connector.source == DocumentSource.INGESTION_API:
            # don't include INGESTION_API, as it's a system level
            # connector not manageable by the user
            continue

        if credential is not None:
            found = False
            for cc_pair in connector.credentials:
                if credential == cc_pair.credential_id:
                    found = True
                    break

            if not found:
                continue

        filtered_connectors.append(ConnectorSnapshot.from_connector_db_model(connector))

    return filtered_connectors


@router.get("/admin/connector/indexing-status")
def get_connector_indexing_status(
    secondary_index: bool = False,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    get_editable: bool = Query(
        False, description="If true, return editable document sets"
    ),
    tenant_id: str | None = Depends(get_current_tenant_id),
) -> list[ConnectorIndexingStatus]:
    indexing_statuses: list[ConnectorIndexingStatus] = []

    # NOTE: If the connector is deleting behind the scenes,
    # accessing cc_pairs can be inconsistent and members like
    # connector or credential may be None.
    # Additional checks are done to make sure the connector and credential still exist.
    # TODO: make this one query ... possibly eager load or wrap in a read transaction
    # to avoid the complexity of trying to error check throughout the function
    cc_pairs = get_connector_credential_pairs(
        db_session=db_session,
        user=user,
        get_editable=get_editable,
    )

    cc_pair_identifiers = [
        ConnectorCredentialPairIdentifier(
            connector_id=cc_pair.connector_id, credential_id=cc_pair.credential_id
        )
        for cc_pair in cc_pairs
    ]

    latest_index_attempts = get_latest_index_attempts(
        secondary_index=secondary_index,
        db_session=db_session,
    )

    cc_pair_to_latest_index_attempt = {
        (
            index_attempt.connector_credential_pair.connector_id,
            index_attempt.connector_credential_pair.credential_id,
        ): index_attempt
        for index_attempt in latest_index_attempts
    }

    document_count_info = get_document_counts_for_cc_pairs(
        db_session=db_session,
        cc_pair_identifiers=cc_pair_identifiers,
    )
    cc_pair_to_document_cnt = {
        (connector_id, credential_id): cnt
        for connector_id, credential_id, cnt in document_count_info
    }

    group_cc_pair_relationships = get_cc_pair_groups_for_ids(
        db_session=db_session,
        cc_pair_ids=[cc_pair.id for cc_pair in cc_pairs],
    )
    group_cc_pair_relationships_dict: dict[int, list[int]] = {}
    for relationship in group_cc_pair_relationships:
        group_cc_pair_relationships_dict.setdefault(relationship.cc_pair_id, []).append(
            relationship.user_group_id
        )

    search_settings: SearchSettings | None = None
    if not secondary_index:
        search_settings = get_current_search_settings(db_session)
    else:
        search_settings = get_secondary_search_settings(db_session)

    for cc_pair in cc_pairs:
        # TODO remove this to enable ingestion API
        if cc_pair.name == "DefaultCCPair":
            continue

        connector = cc_pair.connector
        credential = cc_pair.credential
        if not connector or not credential:
            # This may happen if background deletion is happening
            continue

        in_progress = False
        if search_settings:
            redis_connector = RedisConnector(tenant_id, cc_pair.id)
            redis_connector_index = redis_connector.new_index(search_settings.id)
            if redis_connector_index.fenced:
                in_progress = True

        latest_index_attempt = cc_pair_to_latest_index_attempt.get(
            (connector.id, credential.id)
        )

        latest_finished_attempt = get_latest_index_attempt_for_cc_pair_id(
            db_session=db_session,
            connector_credential_pair_id=cc_pair.id,
            secondary_index=secondary_index,
            only_finished=True,
        )

        indexing_statuses.append(
            ConnectorIndexingStatus(
                cc_pair_id=cc_pair.id,
                name=cc_pair.name,
                cc_pair_status=cc_pair.status,
                connector=ConnectorSnapshot.from_connector_db_model(connector),
                credential=CredentialSnapshot.from_credential_db_model(credential),
                access_type=cc_pair.access_type,
                owner=credential.user.email if credential.user else "",
                groups=group_cc_pair_relationships_dict.get(cc_pair.id, []),
                last_finished_status=(
                    latest_finished_attempt.status if latest_finished_attempt else None
                ),
                last_status=(
                    latest_index_attempt.status if latest_index_attempt else None
                ),
                last_success=cc_pair.last_successful_index_time,
                docs_indexed=cc_pair_to_document_cnt.get(
                    (connector.id, credential.id), 0
                ),
                error_msg=(
                    latest_index_attempt.error_msg if latest_index_attempt else None
                ),
                latest_index_attempt=(
                    IndexAttemptSnapshot.from_index_attempt_db_model(
                        latest_index_attempt
                    )
                    if latest_index_attempt
                    else None
                ),
                deletion_attempt=get_deletion_attempt_snapshot(
                    connector_id=connector.id,
                    credential_id=credential.id,
                    db_session=db_session,
                    tenant_id=tenant_id,
                ),
                is_deletable=check_deletion_attempt_is_allowed(
                    connector_credential_pair=cc_pair,
                    db_session=db_session,
                    # allow scheduled indexing attempts here, since on deletion request we will cancel them
                    allow_scheduled=True,
                )
                is None,
                in_progress=in_progress,
            )
        )

    return indexing_statuses


@router.get("/admin/background/indexing")
def get_background_indexing(
    user: User = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
    tenant_id: str | None = Depends(get_current_tenant_id),
) -> list[ConnectorBackgroundIndexingStatus]:
    indexing_statuses: list[ConnectorBackgroundIndexingStatus] = []

    r = get_redis_client(tenant_id=tenant_id)

    for key_bytes in r.scan_iter(RedisConnectorIndex.FENCE_PREFIX + "*"):
        redis_ids = RedisConnectorIndex.parse_key(key_bytes)
        if not redis_ids:
            continue

        redis_connector = RedisConnector(tenant_id, redis_ids.cc_pair_id)
        redis_connector_index = redis_connector.new_index(redis_ids.search_settings_id)
        if not redis_connector_index.fenced:
            continue

        payload = redis_connector_index.payload
        if not payload:
            continue

        if not payload.started:
            continue

        n_progress = redis_connector_index.get_progress()
        if not n_progress:
            n_progress = 0

        cc_pair = get_connector_credential_pair_from_id(
            redis_ids.cc_pair_id, db_session
        )
        if not cc_pair:
            continue

        indexing_statuses.append(
            ConnectorBackgroundIndexingStatus(
                name=cc_pair.name,
                source=cc_pair.connector.source,
                started=payload.started,
                progress=n_progress,
                index_attempt_id=payload.index_attempt_id,
                cc_pair_id=redis_ids.cc_pair_id,
                search_settings_id=redis_ids.search_settings_id,
            )
        )

    # Sort the statuses
    indexing_statuses = sorted(
        indexing_statuses,
        key=lambda status: (status.cc_pair_id, status.search_settings_id),
    )

    return indexing_statuses


def _validate_connector_allowed(source: DocumentSource) -> None:
    valid_connectors = [
        x for x in ENABLED_CONNECTOR_TYPES.replace("_", "").split(",") if x
    ]
    if not valid_connectors:
        return
    for connector_type in valid_connectors:
        if source.value.lower().replace("_", "") == connector_type:
            return

    raise ValueError(
        "This connector type has been disabled by your system admin. "
        "Please contact them to get it enabled if you wish to use it."
    )


@router.post("/admin/connector")
def create_connector_from_model(
    connector_data: ConnectorUpdateRequest,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ObjectCreationIdResponse:
    try:
        _validate_connector_allowed(connector_data.source)

        fetch_ee_implementation_or_noop(
            "danswer.db.user_group", "validate_user_creation_permissions", None
        )(
            db_session=db_session,
            user=user,
            target_group_ids=connector_data.groups,
            object_is_public=connector_data.access_type == AccessType.PUBLIC,
            object_is_perm_sync=connector_data.access_type == AccessType.SYNC,
        )
        connector_base = connector_data.to_connector_base()
        return create_connector(
            db_session=db_session,
            connector_data=connector_base,
        )
    except ValueError as e:
        logger.error(f"Error creating connector: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/connector-with-mock-credential")
def create_connector_with_mock_credential(
    connector_data: ConnectorUpdateRequest,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    fetch_ee_implementation_or_noop(
        "danswer.db.user_group", "validate_user_creation_permissions", None
    )(
        db_session=db_session,
        user=user,
        target_group_ids=connector_data.groups,
        object_is_public=connector_data.access_type == AccessType.PUBLIC,
        object_is_perm_sync=connector_data.access_type == AccessType.SYNC,
    )
    try:
        _validate_connector_allowed(connector_data.source)
        connector_response = create_connector(
            db_session=db_session,
            connector_data=connector_data,
        )

        mock_credential = CredentialBase(
            credential_json={},
            admin_public=True,
            source=connector_data.source,
        )
        credential = create_credential(
            credential_data=mock_credential,
            user=user,
            db_session=db_session,
        )

        response = add_credential_to_connector(
            db_session=db_session,
            user=user,
            connector_id=cast(int, connector_response.id),  # will aways be an int
            credential_id=credential.id,
            access_type=connector_data.access_type,
            cc_pair_name=connector_data.name,
            groups=connector_data.groups,
        )
        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/admin/connector/{connector_id}")
def update_connector_from_model(
    connector_id: int,
    connector_data: ConnectorUpdateRequest,
    user: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    try:
        _validate_connector_allowed(connector_data.source)
        fetch_ee_implementation_or_noop(
            "danswer.db.user_group", "validate_user_creation_permissions", None
        )(
            db_session=db_session,
            user=user,
            target_group_ids=connector_data.groups,
            object_is_public=connector_data.access_type == AccessType.PUBLIC,
            object_is_perm_sync=connector_data.access_type == AccessType.SYNC,
        )
        connector_base = connector_data.to_connector_base()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    updated_connector = update_connector(connector_id, connector_base, db_session)
    if updated_connector is None:
        raise HTTPException(
            status_code=404, detail=f"Connector {connector_id} does not exist"
        )

    return ConnectorSnapshot(
        id=updated_connector.id,
        name=updated_connector.name,
        source=updated_connector.source,
        input_type=updated_connector.input_type,
        connector_specific_config=updated_connector.connector_specific_config,
        refresh_freq=updated_connector.refresh_freq,
        prune_freq=updated_connector.prune_freq,
        credential_ids=[
            association.credential.id for association in updated_connector.credentials
        ],
        indexing_start=updated_connector.indexing_start,
        time_created=updated_connector.time_created,
        time_updated=updated_connector.time_updated,
    )


@router.delete("/admin/connector/{connector_id}", response_model=StatusResponse[int])
def delete_connector_by_id(
    connector_id: int,
    _: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse[int]:
    try:
        with db_session.begin():
            return delete_connector(
                db_session=db_session,
                connector_id=connector_id,
            )
    except AssertionError:
        raise HTTPException(status_code=400, detail="Connector is not deletable")


@router.post("/admin/connector/run-once")
def connector_run_once(
    run_info: RunConnectorRequest,
    _: User = Depends(current_curator_or_admin_user),
    db_session: Session = Depends(get_session),
    tenant_id: str = Depends(get_current_tenant_id),
) -> StatusResponse[int]:
    """Used to trigger indexing on a set of cc_pairs associated with a
    single connector."""

    connector_id = run_info.connector_id
    specified_credential_ids = run_info.credential_ids

    try:
        possible_credential_ids = get_connector_credential_ids(
            run_info.connector_id, db_session
        )
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Connector by id {connector_id} does not exist.",
        )

    if not specified_credential_ids:
        credential_ids = possible_credential_ids
    else:
        if set(specified_credential_ids).issubset(set(possible_credential_ids)):
            credential_ids = specified_credential_ids
        else:
            raise HTTPException(
                status_code=400,
                detail="Not all specified credentials are associated with connector",
            )

    if not credential_ids:
        raise HTTPException(
            status_code=400,
            detail="Connector has no valid credentials, cannot create index attempts.",
        )

    # Prevents index attempts for cc pairs that already have an index attempt currently running
    skipped_credentials = [
        credential_id
        for credential_id in credential_ids
        if get_index_attempts_for_cc_pair(
            cc_pair_identifier=ConnectorCredentialPairIdentifier(
                connector_id=run_info.connector_id,
                credential_id=credential_id,
            ),
            only_current=True,
            db_session=db_session,
            disinclude_finished=True,
        )
    ]

    connector_credential_pairs = [
        get_connector_credential_pair(connector_id, credential_id, db_session)
        for credential_id in credential_ids
        if credential_id not in skipped_credentials
    ]

    num_triggers = 0
    for cc_pair in connector_credential_pairs:
        if cc_pair is not None:
            indexing_mode = IndexingMode.UPDATE
            if run_info.from_beginning:
                indexing_mode = IndexingMode.REINDEX

            mark_ccpair_with_indexing_trigger(cc_pair.id, indexing_mode, db_session)
            num_triggers += 1

            logger.info(
                f"connector_run_once - marking cc_pair with indexing trigger: "
                f"connector={run_info.connector_id} "
                f"cc_pair={cc_pair.id} "
                f"indexing_trigger={indexing_mode}"
            )

    # run the beat task to pick up the triggers immediately
    primary_app.send_task(
        DanswerCeleryTask.CHECK_FOR_INDEXING,
        priority=DanswerCeleryPriority.HIGH,
        kwargs={"tenant_id": tenant_id},
    )

    msg = f"Marked {num_triggers} index attempts with indexing triggers."
    return StatusResponse(
        success=True,
        message=msg,
        data=num_triggers,
    )


"""Endpoints for basic users"""


@router.get("/connector/gmail/authorize/{credential_id}")
def gmail_auth(
    response: Response, credential_id: str, _: User = Depends(current_user)
) -> AuthUrl:
    # set a cookie that we can read in the callback (used for `verify_csrf`)
    response.set_cookie(
        key=_GMAIL_CREDENTIAL_ID_COOKIE_NAME,
        value=credential_id,
        httponly=True,
        max_age=600,
    )
    return AuthUrl(auth_url=get_auth_url(int(credential_id), DocumentSource.GMAIL))


@router.get("/connector/google-drive/authorize/{credential_id}")
def google_drive_auth(
    response: Response, credential_id: str, _: User = Depends(current_user)
) -> AuthUrl:
    # set a cookie that we can read in the callback (used for `verify_csrf`)
    response.set_cookie(
        key=_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME,
        value=credential_id,
        httponly=True,
        max_age=600,
    )
    return AuthUrl(
        auth_url=get_auth_url(int(credential_id), DocumentSource.GOOGLE_DRIVE)
    )


@router.get("/connector/gmail/callback")
def gmail_callback(
    request: Request,
    callback: GmailCallback = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    credential_id_cookie = request.cookies.get(_GMAIL_CREDENTIAL_ID_COOKIE_NAME)
    if credential_id_cookie is None or not credential_id_cookie.isdigit():
        raise HTTPException(
            status_code=401, detail="Request did not pass CSRF verification."
        )
    credential_id = int(credential_id_cookie)
    verify_csrf(credential_id, callback.state)
    credentials: Credentials | None = update_credential_access_tokens(
        callback.code,
        credential_id,
        user,
        db_session,
        DocumentSource.GMAIL,
        GoogleOAuthAuthenticationMethod.UPLOADED,
    )
    if credentials is None:
        raise HTTPException(
            status_code=500, detail="Unable to fetch Gmail access tokens"
        )

    return StatusResponse(success=True, message="Updated Gmail access tokens")


@router.get("/connector/google-drive/callback")
def google_drive_callback(
    request: Request,
    callback: GDriveCallback = Depends(),
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StatusResponse:
    credential_id_cookie = request.cookies.get(_GOOGLE_DRIVE_CREDENTIAL_ID_COOKIE_NAME)
    if credential_id_cookie is None or not credential_id_cookie.isdigit():
        raise HTTPException(
            status_code=401, detail="Request did not pass CSRF verification."
        )
    credential_id = int(credential_id_cookie)
    verify_csrf(credential_id, callback.state)

    credentials: Credentials | None = update_credential_access_tokens(
        callback.code,
        credential_id,
        user,
        db_session,
        DocumentSource.GOOGLE_DRIVE,
        GoogleOAuthAuthenticationMethod.UPLOADED,
    )
    if credentials is None:
        raise HTTPException(
            status_code=500, detail="Unable to fetch Google Drive access tokens"
        )

    return StatusResponse(success=True, message="Updated Google Drive access tokens")


@router.get("/connector")
def get_connectors(
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[ConnectorSnapshot]:
    connectors = fetch_connectors(db_session)
    return [
        ConnectorSnapshot.from_connector_db_model(connector)
        for connector in connectors
        # don't include INGESTION_API, as it's not a "real"
        # connector like those created by the user
        if connector.source != DocumentSource.INGESTION_API
    ]


@router.get("/connector/{connector_id}")
def get_connector_by_id(
    connector_id: int,
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ConnectorSnapshot | StatusResponse[int]:
    connector = fetch_connector_by_id(connector_id, db_session)
    if connector is None:
        raise HTTPException(
            status_code=404, detail=f"Connector {connector_id} does not exist"
        )

    return ConnectorSnapshot(
        id=connector.id,
        name=connector.name,
        source=connector.source,
        indexing_start=connector.indexing_start,
        input_type=connector.input_type,
        connector_specific_config=connector.connector_specific_config,
        refresh_freq=connector.refresh_freq,
        prune_freq=connector.prune_freq,
        credential_ids=[
            association.credential.id for association in connector.credentials
        ],
        time_created=connector.time_created,
        time_updated=connector.time_updated,
    )


class BasicCCPairInfo(BaseModel):
    has_successful_run: bool
    source: DocumentSource


@router.get("/connector-status")
def get_basic_connector_indexing_status(
    _: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> list[BasicCCPairInfo]:
    cc_pairs = get_connector_credential_pairs(db_session)
    return [
        BasicCCPairInfo(
            has_successful_run=cc_pair.last_successful_index_time is not None,
            source=cc_pair.connector.source,
        )
        for cc_pair in cc_pairs
        if cc_pair.connector.source != DocumentSource.INGESTION_API
    ]
