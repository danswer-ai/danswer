from collections.abc import Iterator
from typing import Any
from typing import cast

from googleapiclient.discovery import build  # type: ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.retry_wrapper import retry_builder
from danswer.connectors.google_drive.connector_auth import (
    get_google_drive_creds,
)
from danswer.db.models import ConnectorCredentialPair
from ee.danswer.db.document import upsert_document_external_perms

_FETCH_PERMISSIONS_SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"]
# Google Drive APIs are quite flakey and may 500 for an
# extended period of time. Trying to combat here by adding a very
# long retry period (~20 minutes of trying every minute)
add_retries = retry_builder(tries=5, delay=5, max_delay=30)


def _fetch_google_permissions_for_document_id(
    drive_file_id: str,
    raw_credentials_json: dict[str, str],
    company_google_domains: list[str],
) -> ExternalAccess:
    # Authenticate and construct service
    google_drive_creds, _ = get_google_drive_creds(
        raw_credentials_json, scopes=_FETCH_PERMISSIONS_SCOPES
    )

    drive_service = build("drive", "v3", credentials=google_drive_creds)

    def _fetch_permissions_paginated() -> Iterator[dict[str, Any]]:
        next_token = None
        while True:
            permissions_resp: dict[str, Any] = add_retries(
                lambda: (
                    drive_service.permissions()
                    .list(
                        fileId=drive_file_id,
                        fields="permissions(id, emailAddress, role, type, domain)",
                        supportsAllDrives=True,
                        pageToken=next_token,
                    )
                    .execute()
                )
            )()
            for permission in permissions_resp.get("permissions", []):
                yield permission

            next_token = permissions_resp.get("nextPageToken")
            if not next_token:
                break

    users: set[str] = set()
    groups: set[str] = set()
    public = False
    for permission in _fetch_permissions_paginated():
        permission_type = permission["type"]
        if permission_type == "user":
            users.add(permission["emailAddress"])
        elif permission_type == "group":
            groups.add(permission["emailAddress"])
        elif permission_type == "domain":
            if permission["domain"] in company_google_domains:
                public = True
        elif permission_type == "anyone":
            public = True

    return ExternalAccess(
        external_user_emails=users,
        external_user_group_ids=groups,
        is_externally_public=public,
    )


def gdrive_doc_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
    docs_with_additional_info: dict[str, Any],
    sync_details: dict[str, Any],
) -> None:
    """
    Adds the external permissions to the documents in postgres
    if the document doesn't already exists in postgres, we create
    it in postgres so that when it gets created later, the permissions are
    already populated
    """
    for danswer_doc_id, drive_doc_id in docs_with_additional_info.items():
        ext_access = _fetch_google_permissions_for_document_id(
            drive_file_id=drive_doc_id,
            raw_credentials_json=cc_pair.credential.credential_json,
            company_google_domains=[
                cast(dict[str, str], sync_details)["company_domain"]
            ],
        )
        upsert_document_external_perms(
            db_session=db_session,
            doc_id=danswer_doc_id,
            external_access=ext_access,
            source_type=DocumentSource.GOOGLE_DRIVE,
        )
