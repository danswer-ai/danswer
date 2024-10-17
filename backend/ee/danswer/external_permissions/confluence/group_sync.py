from collections.abc import Iterator

from atlassian import Confluence  # type:ignore
from requests import HTTPError
from sqlalchemy.orm import Session

from danswer.connectors.confluence.rate_limit_handler import (
    make_confluence_call_handle_rate_limit,
)
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.db.external_perm import replace_user__ext_group_for_cc_pair__no_commit
from ee.danswer.external_permissions.confluence.sync_utils import (
    build_confluence_client,
)
from ee.danswer.external_permissions.confluence.sync_utils import (
    get_user_email_from_username__server,
)


logger = setup_logger()

_PAGE_SIZE = 100


def _get_confluence_group_names_paginated(
    confluence_client: Confluence,
) -> Iterator[str]:
    get_all_groups = make_confluence_call_handle_rate_limit(
        confluence_client.get_all_groups
    )

    start = 0
    while True:
        try:
            groups = get_all_groups(start=start, limit=_PAGE_SIZE)
        except HTTPError as e:
            if e.response.status_code in (403, 404):
                return
            raise e

        for group in groups:
            if group_name := group.get("name"):
                yield group_name

        if len(groups) < _PAGE_SIZE:
            break
        start += _PAGE_SIZE


def _get_group_members_email_paginated(
    confluence_client: Confluence,
    group_name: str,
    is_cloud: bool,
) -> set[str]:
    get_group_members = make_confluence_call_handle_rate_limit(
        confluence_client.get_group_members
    )
    group_member_emails: set[str] = set()
    start = 0
    while True:
        try:
            members = get_group_members(
                group_name=group_name, start=start, limit=_PAGE_SIZE
            )
        except HTTPError as e:
            if e.response.status_code == 403 or e.response.status_code == 404:
                return group_member_emails
            raise e

        for member in members:
            if is_cloud:
                email = member.get("email")
            elif user_name := member.get("username"):
                email = get_user_email_from_username__server(
                    confluence_client, user_name
                )
            else:
                logger.warning(f"Member has no email or username: {member}")
                email = None

            if email:
                group_member_emails.add(email)

        if len(members) < _PAGE_SIZE:
            break

        start += _PAGE_SIZE

    return group_member_emails


def confluence_group_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> None:
    confluence_client = build_confluence_client(
        connector_specific_config=cc_pair.connector.connector_specific_config,
        credentials_json=cc_pair.credential.credential_json,
    )

    danswer_groups: list[ExternalUserGroup] = []
    is_cloud = cc_pair.connector.connector_specific_config.get("is_cloud", False)
    # Confluence enforces that group names are unique
    for group_name in _get_confluence_group_names_paginated(confluence_client):
        group_member_emails = _get_group_members_email_paginated(
            confluence_client, group_name, is_cloud
        )
        group_members = batch_add_non_web_user_if_not_exists__no_commit(
            db_session=db_session, emails=list(group_member_emails)
        )
        if group_members:
            danswer_groups.append(
                ExternalUserGroup(
                    id=group_name,
                    user_ids=[user.id for user in group_members],
                )
            )

    replace_user__ext_group_for_cc_pair__no_commit(
        db_session=db_session,
        cc_pair_id=cc_pair.id,
        group_defs=danswer_groups,
        source=cc_pair.connector.source,
    )
