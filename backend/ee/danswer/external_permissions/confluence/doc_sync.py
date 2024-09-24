from typing import Any

from atlassian import Confluence  # type:ignore
from sqlalchemy.orm import Session

from danswer.access.models import ExternalAccess
from danswer.connectors.confluence.confluence_utils import (
    generate_confluence_document_id,
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


def _get_space_permissions(
    db_session: Session,
    confluence_client: Confluence,
    space_id: str,
) -> ExternalAccess:
    get_space_permissions = make_confluence_call_handle_rate_limit(
        confluence_client.get_space_permissions
    )

    space_permissions = get_space_permissions(space_id).get("permissions", [])
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
    batch_add_non_web_user_if_not_exists__no_commit(
        db_session=db_session, emails=list(user_emails)
    )
    return ExternalAccess(
        external_user_emails=user_emails,
        external_user_group_ids=group_names,
        is_public=is_externally_public,
    )


def _get_restrictions_for_page_dict(
    db_session: Session,
    page_dict: dict[str, Any],
    space_permissions: ExternalAccess,
) -> ExternalAccess:
    """
    WARNING: This function includes no pagination. So if a page is private within
    the space and has over 200 users or over 200 groups with explicity read access,
    this function will leave out some users or groups.
    200 is a large amount so it is unlikely, but just be aware.
    """
    restrictions_json = page_dict.get("restrictions", {})
    read_access_dict = restrictions_json.get("read", {}).get("restrictions", {})

    read_access_user_jsons = read_access_dict.get("user", {}).get("results", [])
    read_access_group_jsons = read_access_dict.get("group", {}).get("results", [])

    is_space_public = read_access_user_jsons == [] and read_access_group_jsons == []

    if not is_space_public:
        read_access_user_emails = [
            user["email"] for user in read_access_user_jsons if user.get("email")
        ]
        read_access_groups = [group["name"] for group in read_access_group_jsons]
        batch_add_non_web_user_if_not_exists__no_commit(
            db_session=db_session, emails=list(read_access_user_emails)
        )
        external_access = ExternalAccess(
            external_user_emails=set(read_access_user_emails),
            external_user_group_ids=set(read_access_groups),
            is_public=False,
        )
    else:
        external_access = space_permissions

    return external_access


def _fetch_attachment_document_ids_for_page_dict_paginated(
    confluence_client: Confluence, page_dict: dict[str, Any]
) -> list[str]:
    """
    Starts by just extracting the first page of attachments from
    the page_dict. If all attachments are in the first page, then
    no calls to the api are made from this function.
    """
    get_attachments_from_content = make_confluence_call_handle_rate_limit(
        confluence_client.get_attachments_from_content
    )

    attachment_doc_ids = []
    attachments_dict = page_dict["children"]["attachment"]
    start = 0

    while True:
        attachments_list = attachments_dict["results"]
        attachment_doc_ids.extend(
            [
                generate_confluence_document_id(
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
            page_id=page_dict["id"],
            start=start,
            limit=_REQUEST_PAGINATION_LIMIT,
        )

    return attachment_doc_ids


def _fetch_all_page_jsons_paginated(
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

    all_page_jsons = []
    start = 0
    while True:
        pages_json = get_all_pages_from_space(
            space=space_id,
            start=start,
            limit=_REQUEST_PAGINATION_LIMIT,
            expand=expansion_string,
        )
        all_page_jsons.extend(pages_json)

        response_size = len(pages_json)
        if response_size < _REQUEST_PAGINATION_LIMIT:
            break
        start += response_size

    return all_page_jsons


def _fetch_all_page_restrictions_for_space(
    db_session: Session,
    confluence_client: Confluence,
    space_id: str,
    space_permissions: ExternalAccess,
) -> dict[str, ExternalAccess]:
    all_page_jsons = _fetch_all_page_jsons_paginated(
        confluence_client=confluence_client,
        space_id=space_id,
    )

    document_restrictions: dict[str, ExternalAccess] = {}
    for page_json in all_page_jsons:
        """
        This assigns the same permissions to all attachments of a page and
        the page itself.
        This is because the attachments are stored in the same Confluence space as the page.
        WARNING: We create a dbDocument entry for all attachments, even though attachments
        may not be their own standalone documents. This is likely fine as we just upsert a
        document with just permissions.
        """
        attachment_document_ids = [
            generate_confluence_document_id(
                base_url=confluence_client.url,
                content_url=page_json["_links"]["webui"],
            )
        ]
        attachment_document_ids.extend(
            _fetch_attachment_document_ids_for_page_dict_paginated(
                confluence_client=confluence_client, page_json=page_json
            )
        )
        page_permissions = _get_restrictions_for_page_dict(
            db_session=db_session,
            page_dict=page_json,
            space_permissions=space_permissions,
        )
        for attachment_document_id in attachment_document_ids:
            document_restrictions[attachment_document_id] = page_permissions

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
        confluence_client=confluence_client,
        space_id=cc_pair.connector.connector_specific_config["space"],
    )
    fresh_doc_permissions = _fetch_all_page_restrictions_for_space(
        db_session=db_session,
        confluence_client=confluence_client,
        space_id=cc_pair.connector.connector_specific_config["space"],
        space_permissions=space_permissions,
    )
    for doc_id, ext_access in fresh_doc_permissions.items():
        upsert_document_external_perms__no_commit(
            db_session=db_session,
            doc_id=doc_id,
            external_access=ext_access,
            source_type=cc_pair.connector.source,
        )
