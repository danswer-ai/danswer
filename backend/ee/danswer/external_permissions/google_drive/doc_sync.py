from datetime import datetime
from datetime import timezone
from typing import Any

from googleapiclient.discovery import build  # type: ignore
from googleapiclient.discovery import Resource  # type: ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.cross_connector_utils.retry_wrapper import retry_builder
from danswer.connectors.google_drive.connector import _execute_paginated_retrieval
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.models import SlimDocument
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit

# Google Drive APIs are quite flakey and may 500 for an
# extended period of time. Trying to combat here by adding a very
# long retry period (~20 minutes of trying every minute)
add_retries = retry_builder(tries=5, delay=5, max_delay=30)


logger = setup_logger()

_PERMISSION_ID_PERMISSION_MAP: dict[str, dict[str, Any]] = {}


def _get_slim_docs(
    cc_pair: ConnectorCredentialPair,
) -> tuple[list[SlimDocument], GoogleDriveConnector]:
    # Get all document ids that need their permissions updated

    drive_connector = GoogleDriveConnector(
        **cc_pair.connector.connector_specific_config
    )
    drive_connector.load_credentials(cc_pair.credential.credential_json)
    if drive_connector.service_account_creds is None:
        raise ValueError("Service account credentials not found")

    current_time = datetime.now(timezone.utc)
    start_time = (
        cc_pair.last_time_perm_sync.replace(tzinfo=timezone.utc).timestamp()
        if cc_pair.last_time_perm_sync
        else 0.0
    )
    cc_pair.last_time_perm_sync = current_time

    doc_batch_generator = drive_connector.retrieve_all_slim_documents(
        start=start_time, end=current_time.timestamp()
    )
    slim_docs = [doc for doc_batch in doc_batch_generator for doc in doc_batch]

    return slim_docs, drive_connector


def _fetch_permissions_for_permission_ids(
    admin_service: Resource,
    doc_id: str,
    permission_ids: list[str],
) -> list[dict[str, Any]]:
    # Check cache first for all permission IDs
    permissions = [
        _PERMISSION_ID_PERMISSION_MAP[pid]
        for pid in permission_ids
        if pid in _PERMISSION_ID_PERMISSION_MAP
    ]

    # If we found all permissions in cache, return them
    if len(permissions) == len(permission_ids):
        return permissions

    # Otherwise, fetch all permissions and update cache
    fetched_permissions = _execute_paginated_retrieval(
        retrieval_function=admin_service.permissions().list,
        list_key="permissions",
        fileId=doc_id,
        fields="permissions(id, emailAddress, type, domain)",
        supportsAllDrives=True,
    )

    permissions_for_doc_id = []
    # Update cache and return all permissions
    for permission in fetched_permissions:
        permissions_for_doc_id.append(permission)
        _PERMISSION_ID_PERMISSION_MAP[permission["id"]] = permission

    return permissions_for_doc_id


def _fetch_google_permissions_for_slim_doc(
    db_session: Session,
    admin_service: Resource,
    slim_doc: SlimDocument,
    company_domain: str | None,
) -> ExternalAccess:
    permission_info = slim_doc.perm_sync_data or {}

    permissions_list = permission_info.get("permissions", [])
    if not permissions_list:
        if permission_ids := permission_info.get("permissionIds"):
            permissions_list = _fetch_permissions_for_permission_ids(
                admin_service=admin_service,
                doc_id=slim_doc.id,
                permission_ids=permission_ids,
            )
        if not permissions_list:
            logger.warning(f"No permissions found for document {slim_doc.id}")
            return ExternalAccess(
                external_user_emails=set(),
                external_user_group_ids=set(),
                is_public=False,
            )

    user_emails: set[str] = set()
    group_emails: set[str] = set()
    public = False
    for permission in permissions_list:
        permission_type = permission["type"]
        if permission_type == "user":
            user_emails.add(permission["emailAddress"])
        elif permission_type == "group":
            group_emails.add(permission["emailAddress"])
        elif permission_type == "domain" and company_domain:
            if permission["domain"] == company_domain:
                public = True
        elif permission_type == "anyone":
            public = True

    batch_add_non_web_user_if_not_exists__no_commit(db_session, list(user_emails))

    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_emails,
        is_public=public,
    )


def gdrive_doc_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> None:
    """
    Adds the external permissions to the documents in postgres
    if the document doesn't already exists in postgres, we create
    it in postgres so that when it gets created later, the permissions are
    already populated
    """
    sync_details = cc_pair.auto_sync_options
    if sync_details is None:
        logger.error("Sync details not found for Google Drive")
        raise ValueError("Sync details not found for Google Drive")

    slim_docs, google_drive_connector = _get_slim_docs(cc_pair)

    creds = google_drive_connector.get_primary_user_credentials()
    admin_creds = creds.with_subject(google_drive_connector.service_account_email)
    admin_service = build("admin", "directory_v1", credentials=admin_creds)

    for slim_doc in slim_docs:
        ext_access = _fetch_google_permissions_for_slim_doc(
            db_session=db_session,
            admin_service=admin_service,
            slim_doc=slim_doc,
            company_domain=google_drive_connector.service_account_domain,
        )
        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=slim_doc.id,
            external_access=ext_access,
            source_type=cc_pair.connector.source,
        )
