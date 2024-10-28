from datetime import datetime
from datetime import timezone
from typing import Any

from googleapiclient.discovery import Resource  # type: ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.google_drive.connector import execute_paginated_retrieval
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.models import SlimDocument
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit

logger = setup_logger()

_PERMISSION_ID_PERMISSION_MAP: dict[str, dict[str, Any]] = {}


def _get_slim_docs(
    cc_pair: ConnectorCredentialPair,
    google_drive_connector: GoogleDriveConnector,
) -> tuple[list[SlimDocument], GoogleDriveConnector]:
    current_time = datetime.now(timezone.utc)
    start_time = (
        cc_pair.last_time_perm_sync.replace(tzinfo=timezone.utc).timestamp()
        if cc_pair.last_time_perm_sync
        else 0.0
    )

    doc_batch_generator = google_drive_connector.retrieve_all_slim_documents(
        start=start_time, end=current_time.timestamp()
    )
    slim_docs = [doc for doc_batch in doc_batch_generator for doc in doc_batch]

    return slim_docs


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
    fetched_permissions = execute_paginated_retrieval(
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
    doc_id = permission_info.get("doc_id")
    if not permissions_list:
        if permission_ids := permission_info.get("permission_ids") and doc_id:
            permissions_list = _fetch_permissions_for_permission_ids(
                admin_service=admin_service,
                doc_id=doc_id,
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
    google_drive_connector = GoogleDriveConnector(
        **cc_pair.connector.connector_specific_config
    )
    google_drive_connector.load_credentials(cc_pair.credential.credential_json)

    if google_drive_connector.service_account_creds is None:
        raise ValueError("Service account credentials not found")

    slim_docs = _get_slim_docs(cc_pair, google_drive_connector)
    admin_service = google_drive_connector.get_admin_service()

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
