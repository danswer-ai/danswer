from collections.abc import Iterator
from datetime import datetime
from datetime import timedelta
from typing import Any
from typing import cast

from googleapiclient.discovery import build  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.access.models import ExternalAccess
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.retry_wrapper import retry_builder
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.google_drive.connector_auth import (
    get_google_drive_creds,
)
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import InputType
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import EmailToExternalUserCache
from danswer.db.models import PermissionSyncJobType
from danswer.db.search_settings import get_current_search_settings
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from ee.danswer.background.models import GroupDefinition
from ee.danswer.background.models import GroupSyncRes
from ee.danswer.db.connector_credential_pair import get_cc_pairs_by_source
from ee.danswer.db.document import upsert_document_external_perms
from ee.danswer.db.permission_sync import get_last_sync_attempt

_FETCH_PERMISSIONS_SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"]

_FETCH_GROUPS_SCOPES = [
    "https://www.googleapis.com/auth/cloud-identity.groups",
]


# Google Drive APIs are quite flakey and may 500 for an
# extended period of time. Trying to combat here by adding a very
# long retry period (~20 minutes of trying every minute)
add_retries = retry_builder(tries=5, delay=5, max_delay=30)


def fetch_permissions_for_document_id(
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
        external_user_groups=groups,
        is_public=public,
    )


def fetch_google_drive_groups(
    raw_credentials_json: dict[str, str],
    identity_source: str | None = None,
    customer_id: str | None = None,
    user_cache: dict[str, EmailToExternalUserCache] | None = None,
) -> list[GroupDefinition]:
    # Note that Google Drive does not use of update the user_cache as the user email
    # comes directly with the call to fetch the groups, therefore this is not a valid
    # place to save on requests
    if identity_source is None and customer_id is None:
        raise ValueError(
            "Either identity_source or customer_id must be provided to fetch groups"
        )

    google_drive_creds, _ = get_google_drive_creds(
        raw_credentials_json, scopes=_FETCH_GROUPS_SCOPES
    )

    cloud_identity_service = build(
        "cloudidentity", "v1", credentials=google_drive_creds
    )

    def _fetch_groups_paginated() -> Iterator[dict[str, Any]]:
        parent = (
            f"identitysources/{identity_source}"
            if identity_source
            else f"customers/{customer_id}"
        )

        while True:
            groups_resp: dict[str, Any] = add_retries(
                lambda: (cloud_identity_service.groups().list(parent=parent).execute())
            )()
            for group in groups_resp.get("groups", []):
                yield group

            next_token = groups_resp.get("nextPageToken")
            if not next_token:
                break

    def _fetch_group_members_paginated(group_name: str) -> Iterator[dict[str, Any]]:
        next_token = None
        while True:
            try:
                membership_info = add_retries(
                    lambda: (
                        cloud_identity_service.groups()
                        .memberships()
                        .searchTransitiveMemberships(
                            parent=group_name, pageToken=next_token
                        )
                        .execute()
                    )
                )()

                for member in membership_info.get("memberships", []):
                    yield member

                next_token = membership_info.get("nextPageToken")
                if not next_token:
                    break
            except HttpError as e:
                if e.resp.status == 404 or e.resp.status == 403:
                    break
                raise

    danswer_groups: list[GroupDefinition] = []
    for group in _fetch_groups_paginated():
        group_id = group["groupKey"]["id"]

        emails: list[str] = []
        for member in _fetch_group_members_paginated(group["name"]):
            member_keys = member["preferredMemberKey"]
            member_emails = [member_key["id"] for member_key in member_keys]
            emails.extend(member_emails)

        danswer_groups.append(
            GroupDefinition(
                external_id=group_id,
                source=DocumentSource.GOOGLE_DRIVE,
                user_emails=emails,
            )
        )

    return [group for group in danswer_groups if group.user_emails]


def gdrive_group_sync(
    cc_pairs: list[ConnectorCredentialPair],
    user_cache: dict[str, EmailToExternalUserCache],
) -> GroupSyncRes:
    seen = set()
    group_defs = []
    for cc_pair in cc_pairs:
        sync_details = cc_pair.auto_sync_options
        if not sync_details:
            continue

        customer = sync_details.get("customer_id")
        if customer in seen:
            continue
        seen.add(
            customer
        )  # not actually useful but may extend to support multiple in the future

        group_defs = fetch_google_drive_groups(
            raw_credentials_json=cc_pair.credential.credential_json,
            customer_id=sync_details.get("customer_id"),
            user_cache=user_cache,
        )

        # Only supports one customer_id, this will have updated all the groups globally for Gdrive
        # so we can just stop here
        break

    return GroupSyncRes(group_defs=group_defs, user_ext_cache_update=[])


def gdrive_doc_sync() -> None:
    """Flow is as below:
    1. Get the last gdrive doc sync time
    2. Get all document ids since the sync time (using the connector)
    3. Update all of the documents with the updated Access
    4. For documents that don't exist in Postgres, create them with permissions so that the
       indexing job will pick up the sync-ed permissions when it indexes the doc
    5. Update Vespa with the new documents + Access
    """
    with Session(get_sqlalchemy_engine()) as db_session:
        # Don't bother sync-ing secondary, it will be sync-ed after switch anyway
        search_settings = get_current_search_settings(db_session)
        document_index = get_default_document_index(
            primary_index_name=search_settings.index_name, secondary_index_name=None
        )

        last_successful_attempt = get_last_sync_attempt(
            source_type=DocumentSource.GOOGLE_DRIVE,
            job_type=PermissionSyncJobType.USER_LEVEL,
            db_session=db_session,
            success_only=True,
        )

        start_time = 0.0
        if last_successful_attempt:
            start_time_dt = last_successful_attempt.start_time - timedelta(hours=1)
            start_time = start_time_dt.timestamp()

        cc_pairs = get_cc_pairs_by_source(
            db_session=db_session,
            source_type=DocumentSource.GOOGLE_DRIVE,
            only_sync=True,
        )

        updated_docs: set[tuple[str, str]] = set()

        # Get all document ids that need their permissions updated
        for cc_pair in cc_pairs:
            sync_details = cc_pair.auto_sync_options
            if not sync_details:
                continue

            runnable_connector = instantiate_connector(
                db_session=db_session,
                source=DocumentSource.GOOGLE_DRIVE,
                input_type=InputType.POLL,
                connector_specific_config=cc_pair.connector.connector_specific_config,
                credential=cc_pair.credential,
            )

            assert isinstance(runnable_connector, PollConnector)

            doc_batch_generator = runnable_connector.poll_source(
                start=start_time, end=datetime.now().timestamp()
            )

            for doc_batch in doc_batch_generator:
                updated_docs = updated_docs.union(
                    set((d.id, d.additional_info) for d in doc_batch)
                )

        vespa_sync_docs = []
        for danswer_doc_id, drive_doc_id in updated_docs:
            ext_access = fetch_permissions_for_document_id(
                drive_file_id=drive_doc_id,
                raw_credentials_json=cc_pair.credential.credential_json,
                company_google_domains=[
                    cast(dict[str, str], sync_details)["company_domain"]
                ],
            )
            existed, db_doc = upsert_document_external_perms(
                db_session=db_session,
                doc_id=danswer_doc_id,
                external_access=ext_access,
                source_type=DocumentSource.GOOGLE_DRIVE,
            )

            if existed:
                vespa_sync_docs.append(danswer_doc_id)

        docs_access = get_access_for_documents(
            document_ids=vespa_sync_docs, db_session=db_session
        )

        update_reqs = []
        for doc_id, doc_access in docs_access.items():
            update_reqs.append(UpdateRequest(document_ids=[doc_id], access=doc_access))
        document_index.update(update_reqs)
