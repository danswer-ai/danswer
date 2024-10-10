from typing import Any

from atlassian import Confluence  # type:ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.confluence.confluence_utils import (
    build_confluence_document_id,
)
from danswer.connectors.confluence.rate_limit_handler import (
    make_confluence_call_handle_rate_limit,
)
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.document import upsert_document_external_perms__no_commit
from ee.danswer.external_permissions.confluence.confluence_sync_utils import (
    build_confluence_client,
)


logger = setup_logger()

_REQUEST_PAGINATION_LIMIT = 100


def _extract_user_email(subjects: dict[str, Any]) -> str | None:
    # If the subject is a user, then return the user's email
    user = subjects.get("user", {})
    result = user.get("results", [{}])[0]
    return result.get("email")


def _extract_group_name(subjects: dict[str, Any]) -> str | None:
    # If the subject is a group, then return the group's name
    group = subjects.get("group", {})
    result = group.get("results", [{}])[0]
    return result.get("name")


def _is_public_read_permission(permission: dict[str, Any]) -> bool:
    # If the permission is a public read permission, then return True
    operation = permission.get("operation", {})
    operation_value = operation.get("operation")
    anonymous_access = permission.get("anonymousAccess", False)
    return operation_value == "read" and anonymous_access


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


def _get_space_permissions(
    db_session: Session,
    confluence_client: Confluence,
    space_id: str,
) -> ExternalAccess:
    get_space_permissions = make_confluence_call_handle_rate_limit(
        confluence_client.get_space_permissions
    )

    space_permissions_result = get_space_permissions(space_id)
    logger.debug(f"space_permissions_result: {space_permissions_result}")

    space_permissions = space_permissions_result.get("permissions", [])
    user_emails = set()
    # Confluence enforces that group names are unique
    group_names = set()
    is_externally_public = False
    for permission in space_permissions:
        subjects = permission.get("subjects")
        if subjects:
            # If there are subjects, then there are explicit users or groups with access
            if email := _extract_user_email(subjects):
                user_emails.add(email)
            if group_name := _extract_group_name(subjects):
                group_names.add(group_name)
        else:
            # If there are no subjects, then the permission is for everyone
            if _is_public_read_permission(permission):
                # If the permission specifies read access for anonymous users, then
                # the space is publicly accessible
                is_externally_public = True

    batch_add_non_web_user_if_not_exists__no_commit(
        db_session=db_session, emails=list(user_emails)
    )
    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        is_public=is_externally_public,
    )


def _get_page_specific_restrictions(
    db_session: Session,
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

    batch_add_non_web_user_if_not_exists__no_commit(
        db_session=db_session, emails=list(user_emails)
    )
    return ExternalAccess(
        external_user_emails=set(user_emails),
        external_user_group_ids=set(group_names),
        # there is no way for a page to be individually public if the space isn't public
        is_public=False,
    )


def _fetch_attachment_document_ids_for_page_paginated(
    confluence_client: Confluence, page: dict[str, Any]
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
    confluence_client: Confluence,
    space_id: str,
) -> list[dict[str, Any]]:
    get_all_pages_from_space = make_confluence_call_handle_rate_limit(
        confluence_client.get_all_pages_from_space
    )

    # For each page, this fetches the page's attachments and restrictions.
    expansion_strings = [
        "children.attachment",
        "restrictions.read.restrictions.user",
        "restrictions.read.restrictions.group",
    ]
    expansion_string = ",".join(expansion_strings)

    all_pages = []
    start = 0
    while True:
        pages_dict = get_all_pages_from_space(
            space=space_id,
            start=start,
            limit=_REQUEST_PAGINATION_LIMIT,
            expand=expansion_string,
        )
        all_pages.extend(pages_dict)

        response_size = len(pages_dict)
        if response_size < _REQUEST_PAGINATION_LIMIT:
            break
        start += response_size

    return all_pages


def _fetch_all_page_restrictions_for_space(
    db_session: Session,
    confluence_client: Confluence,
    space_id: str,
) -> dict[str, ExternalAccess | None]:
    all_pages = _fetch_all_pages_paginated(
        confluence_client=confluence_client,
        space_id=space_id,
    )

    document_restrictions: dict[str, ExternalAccess | None] = {}
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
            db_session=db_session,
            page=page,
        )

        # Apply the page's specific restrictions to the page and its attachments
        for document_id in document_ids:
            document_restrictions[document_id] = page_permissions

    return document_restrictions


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
        cc_pair.connector.connector_specific_config, cc_pair.credential.credential_json
    )
    space_permissions = _get_space_permissions(
        db_session=db_session,
        confluence_client=confluence_client,
        space_id=cc_pair.connector.connector_specific_config["space"],
    )
    fresh_doc_permissions = _fetch_all_page_restrictions_for_space(
        db_session=db_session,
        confluence_client=confluence_client,
        space_id=cc_pair.connector.connector_specific_config["space"],
    )
    for doc_id, page_specific_access in fresh_doc_permissions.items():
        # If there are no page specific restrictions, then
        # the page inherits the space's restrictions
        page_access = page_specific_access or space_permissions

        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=doc_id,
            external_access=page_access,
            source_type=cc_pair.connector.source,
        )
