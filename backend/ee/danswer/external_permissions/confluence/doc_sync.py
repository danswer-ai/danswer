"""
Rules defined here:
https://confluence.atlassian.com/conf85/check-who-can-view-a-page-1283360557.html
"""
from typing import Any
from urllib.parse import parse_qs
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.confluence.confluence_utils import (
    build_confluence_document_id,
)
from danswer.connectors.confluence.connector import DanswerConfluence
from danswer.connectors.confluence.rate_limit_handler import (
    make_confluence_call_handle_rate_limit,
)
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit
from ee.danswer.external_permissions.confluence.sync_utils import (
    build_confluence_client,
)
from ee.danswer.external_permissions.confluence.sync_utils import (
    get_user_email_from_username__server,
)

logger = setup_logger()

_VIEWSPACE_PERMISSION_TYPE = "VIEWSPACE"
_REQUEST_PAGINATION_LIMIT = 100


def _get_server_space_permissions(
    confluence_client: DanswerConfluence, space_key: str
) -> ExternalAccess:
    get_space_permissions = make_confluence_call_handle_rate_limit(
        confluence_client.get_space_permissions
    )

    permissions = get_space_permissions(space_key)

    viewspace_permissions = []
    for permission_category in permissions:
        if permission_category.get("type") == _VIEWSPACE_PERMISSION_TYPE:
            viewspace_permissions.extend(
                permission_category.get("spacePermissions", [])
            )

    user_names = set()
    group_names = set()
    for permission in viewspace_permissions:
        if user_name := permission.get("userName"):
            user_names.add(user_name)
        if group_name := permission.get("groupName"):
            group_names.add(group_name)

    user_emails = set()
    for user_name in user_names:
        user_email = get_user_email_from_username__server(confluence_client, user_name)
        if user_email:
            user_emails.add(user_email)
        else:
            logger.warning(f"Email for user {user_name} not found in Confluence")

    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        # TODO: Check if the space is publicly accessible
        # Currently, we assume the space is not public
        # We need to check if anonymous access is turned on for the site and space
        # This information is paywalled so it remains unimplemented
        is_public=False,
    )


def _get_cloud_space_permissions(
    confluence_client: DanswerConfluence, space_key: str
) -> ExternalAccess:
    get_space_permissions = make_confluence_call_handle_rate_limit(
        confluence_client.get_space
    )
    space_permissions_result = get_space_permissions(
        space_key=space_key, expand="permissions"
    )
    space_permissions = space_permissions_result.get("permissions", [])

    user_emails = set()
    group_names = set()
    is_externally_public = False
    for permission in space_permissions:
        subs = permission.get("subjects")
        if subs:
            # If there are subjects, then there are explicit users or groups with access
            if email := subs.get("user", {}).get("results", [{}])[0].get("email"):
                user_emails.add(email)
            if group_name := subs.get("group", {}).get("results", [{}])[0].get("name"):
                group_names.add(group_name)
        else:
            # If there are no subjects, then the permission is for everyone
            if permission.get("operation", {}).get(
                "operation"
            ) == "read" and permission.get("anonymousAccess", False):
                # If the permission specifies read access for anonymous users, then
                # the space is publicly accessible
                is_externally_public = True

    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        is_public=is_externally_public,
    )


def _get_space_permissions(
    confluence_client: DanswerConfluence,
    is_cloud: bool,
) -> dict[str, ExternalAccess]:
    # Gets all the spaces in the Confluence instance
    get_all_spaces = make_confluence_call_handle_rate_limit(
        confluence_client.get_all_spaces
    )
    all_space_keys = []
    start = 0
    while True:
        spaces_batch = get_all_spaces(start=start, limit=_REQUEST_PAGINATION_LIMIT)
        for space in spaces_batch.get("results", []):
            all_space_keys.append(space.get("key"))

        if len(spaces_batch.get("results", [])) < _REQUEST_PAGINATION_LIMIT:
            break

        start += len(spaces_batch.get("results", []))

    # Gets the permissions for each space
    space_permissions_by_space_key: dict[str, ExternalAccess] = {}
    for space_key in all_space_keys:
        if is_cloud:
            space_permissions = _get_cloud_space_permissions(
                confluence_client=confluence_client, space_key=space_key
            )
        else:
            space_permissions = _get_server_space_permissions(
                confluence_client=confluence_client, space_key=space_key
            )

        # Stores the permissions for each space
        space_permissions_by_space_key[space_key] = space_permissions

    return space_permissions_by_space_key


def _extract_read_access_restrictions(
    restrictions: dict[str, Any]
) -> tuple[list[str], list[str]]:
    """
    WARNING: This function includes no paginated retrieval. So if a page is private
    within the space and has over 200 users or over 200 groups with explicitly read
    access, this function will leave out some users or groups.
    200 is a large amount so it is unlikely, but just be aware.
    """
    read_access = restrictions.get("read", {})
    read_access_restrictions = read_access.get("restrictions", {})

    # Extract the users with read access
    read_access_user = read_access_restrictions.get("user", {})
    read_access_user_jsons = read_access_user.get("results", [])
    read_access_user_emails = [
        user["email"] for user in read_access_user_jsons if user.get("email")
    ]

    # Extract the groups with read access
    read_access_group = read_access_restrictions.get("group", {})
    read_access_group_jsons = read_access_group.get("results", [])
    read_access_group_names = [
        group["name"] for group in read_access_group_jsons if group.get("name")
    ]

    return read_access_user_emails, read_access_group_names


def _get_page_specific_restrictions(
    page: dict[str, Any],
) -> ExternalAccess | None:
    user_emails, group_names = _extract_read_access_restrictions(
        restrictions=page.get("restrictions", {})
    )

    # If there are no restrictions found, then the page
    # inherits the space's restrictions so return None
    is_space_public = user_emails == [] and group_names == []
    if is_space_public:
        return None

    return ExternalAccess(
        external_user_emails=set(user_emails),
        external_user_group_ids=set(group_names),
        # there is no way for a page to be individually public if the space isn't public
        is_public=False,
    )


def _fetch_attachment_document_ids_for_page_paginated(
    confluence_client: DanswerConfluence, page: dict[str, Any]
) -> list[str]:
    """
    Starts by just extracting the first page of attachments from
    the page. If all attachments are in the first page, then
    no calls to the api are made from this function.
    """
    get_attachments_from_content = make_confluence_call_handle_rate_limit(
        confluence_client.get_attachments_from_content
    )

    attachment_doc_ids = []
    attachments_dict = page["children"]["attachment"]
    start = 0

    while True:
        attachments_list = attachments_dict["results"]
        attachment_doc_ids.extend(
            [
                build_confluence_document_id(
                    base_url=confluence_client.url,
                    content_url=attachment["_links"]["download"],
                )
                for attachment in attachments_list
            ]
        )

        if "next" not in attachments_dict["_links"]:
            break

        start += len(attachments_list)
        attachments_dict = get_attachments_from_content(
            page_id=page["id"],
            start=start,
            limit=_REQUEST_PAGINATION_LIMIT,
        )

    return attachment_doc_ids


def _fetch_all_pages_paginated(
    confluence_client: DanswerConfluence,
    cql_query: str,
) -> list[dict[str, Any]]:
    get_all_pages = make_confluence_call_handle_rate_limit(
        confluence_client.danswer_cql
    )

    # For each page, this fetches the page's attachments and restrictions.
    expansion_strings = [
        "children.attachment",
        "restrictions.read.restrictions.user",
        "restrictions.read.restrictions.group",
        "space",
    ]
    expansion_string = ",".join(expansion_strings)

    all_pages: list[dict[str, Any]] = []
    cursor = None
    while True:
        response = get_all_pages(
            cql=cql_query,
            expand=expansion_string,
            cursor=cursor,
            limit=_REQUEST_PAGINATION_LIMIT,
        )

        all_pages.extend(response.get("results", []))

        # Handle pagination
        next_cursor = response.get("_links", {}).get("next", "")
        cursor = parse_qs(urlparse(next_cursor).query).get("cursor", [None])[0]

        if not cursor:
            break

    return all_pages


def _fetch_all_page_restrictions_for_space(
    confluence_client: DanswerConfluence,
    cql_query: str,
    space_permissions_by_space_key: dict[str, ExternalAccess],
) -> dict[str, ExternalAccess]:
    all_pages = _fetch_all_pages_paginated(
        confluence_client=confluence_client,
        cql_query=cql_query,
    )

    document_restrictions: dict[str, ExternalAccess] = {}
    for page in all_pages:
        """
        This assigns the same permissions to all attachments of a page and
        the page itself.
        This is because the attachments are stored in the same Confluence space as the page.
        WARNING: We create a dbDocument entry for all attachments, even though attachments
        may not be their own standalone documents. This is likely fine as we just upsert a
        document with just permissions.
        """
        document_ids = []

        # Add the page's document id
        document_ids.append(
            build_confluence_document_id(
                base_url=confluence_client.url,
                content_url=page["_links"]["webui"],
            )
        )

        # Add the page's attachments document ids
        document_ids.extend(
            _fetch_attachment_document_ids_for_page_paginated(
                confluence_client=confluence_client, page=page
            )
        )

        # Get the page's specific restrictions
        page_permissions = _get_page_specific_restrictions(
            page=page,
        )

        if not page_permissions:
            # If there are no page specific restrictions,
            # the page inherits the space's restrictions
            page_permissions = space_permissions_by_space_key.get(page["space"]["key"])
            if not page_permissions:
                # If nothing is in the dict, then the space has not been indexed, so we move on
                continue

        # Apply the page's specific restrictions to the page and its attachments
        for document_id in document_ids:
            document_restrictions[document_id] = page_permissions

    return document_restrictions


def _build_cql_query_from_connector_config(
    cc_pair: ConnectorCredentialPair,
) -> str:
    cql_query = cc_pair.connector.connector_specific_config.get("cql_query")
    if cql_query:
        return cql_query

    space_id = cc_pair.connector.connector_specific_config.get("space")
    if space_id:
        return f"type=page and space='{space_id}'"
    return "type=page"


def confluence_doc_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> None:
    """
    Adds the external permissions to the documents in postgres
    if the document doesn't already exists in postgres, we create
    it in postgres so that when it gets created later, the permissions are
    already populated
    """
    confluence_client = build_confluence_client(
        connector_specific_config=cc_pair.connector.connector_specific_config,
        credentials_json=cc_pair.credential.credential_json,
    )

    cql_query = _build_cql_query_from_connector_config(cc_pair)
    is_cloud = cc_pair.connector.connector_specific_config.get("is_cloud", False)

    space_permissions_by_space_key = _get_space_permissions(
        confluence_client=confluence_client,
        is_cloud=is_cloud,
    )

    permissions_by_doc_id = _fetch_all_page_restrictions_for_space(
        confluence_client=confluence_client,
        cql_query=cql_query,
        space_permissions_by_space_key=space_permissions_by_space_key,
    )

    all_emails = set()
    for doc_id, page_specific_access in permissions_by_doc_id.items():
        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=doc_id,
            external_access=page_specific_access,
            source_type=cc_pair.connector.source,
        )
        all_emails.update(page_specific_access.external_user_emails)

    batch_add_non_web_user_if_not_exists__no_commit(db_session, list(all_emails))
