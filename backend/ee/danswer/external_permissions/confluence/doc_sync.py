from typing import Any

from atlassian import Confluence  # type:ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit
from ee.danswer.external_permissions.permission_sync_utils import DocsWithAdditionalInfo


logger = setup_logger()


def _get_confluence_client(
    connector_specific_config: dict[str, Any], raw_credentials_json: dict[str, Any]
) -> Confluence:
    is_cloud = connector_specific_config.get("is_cloud", False)
    return Confluence(
        api_version="cloud" if is_cloud else "latest",
        url=connector_specific_config["wiki_base"].rstrip("/"),
        # passing in username causes issues for Confluence data center
        username=raw_credentials_json["username"] if is_cloud else None,
        password=raw_credentials_json["access_token"] if is_cloud else None,
        token=raw_credentials_json["access_token"] if not is_cloud else None,
    )


def _get_space_permissions(
    confluence_client: Confluence, space_id: str
) -> ExternalAccess:
    space_permissions = confluence_client.get_space_permissions(space_id).get(
        "permissions", []
    )
    user_emails = set()
    group_names = set()
    is_externally_public = False
    for permission in space_permissions:
        subjects = permission.get("subjects", {})
        if "user" in subjects:
            user_email = subjects["user"]["results"][0]["email"]
            if user_email:
                user_emails.add(user_email)
        elif "group" in subjects:
            group_name = subjects["group"]["results"][0]["name"]
            if group_name:
                group_names.add(group_name)
        elif (
            subjects == {}
            and permission.get("operation", {}).get("operation") == "read"
            and permission.get("anonymousAccess", False)
        ):
            is_externally_public = True
    return ExternalAccess(
        external_user_emails=set(),
        external_user_group_ids=set(),
        is_public=is_externally_public,
    )


def _fetch_confluence_permissions_for_document_id(
    db_session: Session,
    confluence_client: Confluence,
    space_permissions: ExternalAccess,
    content_id: str | None,
) -> ExternalAccess:
    """
    Fetches the external permissions for a confluence document
    TODO: Determine how to retrieve if the page has been marked public through the API
    """
    if content_id is None:
        # If not content id, then just default to applying the space permissions
        return space_permissions

    restrictions_json = confluence_client.get_all_restrictions_for_content(content_id)
    read_access_restrictions_dict = restrictions_json.get("read", {}).get(
        "restrictions", {}
    )

    read_access_user_jsons: list[dict[str, Any]] = read_access_restrictions_dict.get(
        "user", {}
    ).get("results", [])
    read_access_group_jsons: list[dict[str, Any]] = read_access_restrictions_dict.get(
        "group", {}
    ).get("results", [])

    is_space_public = read_access_user_jsons == [] and read_access_group_jsons == []

    if not is_space_public:
        read_access_user_emails = [
            user["email"] for user in read_access_user_jsons if user.get("email")
        ]
        read_access_groups = [group["name"] for group in read_access_group_jsons]
        external_access = ExternalAccess(
            external_user_emails=set(read_access_user_emails),
            external_user_group_ids=set(read_access_groups),
            is_public=False,
        )
    else:
        external_access = space_permissions

    batch_add_non_web_user_if_not_exists__no_commit(
        db_session, list(external_access.external_user_emails)
    )
    return external_access


def confluence_doc_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
    docs_with_additional_info: list[DocsWithAdditionalInfo],
    sync_details: dict[str, Any],
) -> None:
    """
    Adds the external permissions to the documents in postgres
    if the document doesn't already exists in postgres, we create
    it in postgres so that when it gets created later, the permissions are
    already populated
    """
    confluence_client = _get_confluence_client(
        cc_pair.connector.connector_specific_config, cc_pair.credential.credential_json
    )
    space_permissions = _get_space_permissions(
        confluence_client=confluence_client,
        space_id=cc_pair.connector.connector_specific_config["space"],
    )
    for doc in docs_with_additional_info:
        ext_access = _fetch_confluence_permissions_for_document_id(
            db_session=db_session,
            confluence_client=confluence_client,
            space_permissions=space_permissions,
            content_id=doc.additional_info.get("permission_base_content_id"),
        )
        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=doc.id,
            external_access=ext_access,
            source_type=cc_pair.connector.source,
        )
