from typing import Any

from atlassian import Confluence  # type:ignore
from requests import HTTPError
from retry import retry
from sqlalchemy.orm import Session

from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.db.external_perm import replace_user__ext_group_for_cc_pair__no_commit
from ee.danswer.external_permissions.permission_sync_utils import DocsWithAdditionalInfo


logger = setup_logger()

_PAGE_SIZE = 100


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


@retry(tries=5, delay=5)
def _get_confluence_group_names_paginated(
    confluence_client: Confluence,
) -> list[str]:
    all_group_names: list[str] = []
    start = 0
    while True:
        try:
            groups = confluence_client.get_all_groups(start=start, limit=_PAGE_SIZE)
        except HTTPError as e:
            if e.response.status_code == 403 or e.response.status_code == 404:
                return all_group_names
            raise e
        all_group_names.extend(
            [group.get("name") for group in groups if group.get("name")]
        )
        if len(groups) < _PAGE_SIZE:
            break
        start += _PAGE_SIZE
    return all_group_names


@retry(tries=5, delay=5)
def _get_group_members_email_paginated(
    confluence_client: Confluence,
    group_name: str,
) -> list[str]:
    group_member_emails: list[str] = []
    start = 0
    while True:
        try:
            members = confluence_client.get_group_members(
                group_name=group_name, start=start, limit=_PAGE_SIZE
            )
        except HTTPError as e:
            if e.response.status_code == 403 or e.response.status_code == 404:
                return group_member_emails
            raise e

        emails = [member.get("email") for member in members if member.get("email")]
        group_member_emails.extend(emails)
        if len(members) < _PAGE_SIZE:
            break
        start += _PAGE_SIZE
    return group_member_emails


def confluence_group_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
    docs_with_additional_info: list[DocsWithAdditionalInfo],
    sync_details: dict[str, Any],
) -> None:
    confluence_client = _get_confluence_client(
        cc_pair.connector.connector_specific_config, cc_pair.credential.credential_json
    )

    all_group_names = _get_confluence_group_names_paginated(confluence_client)

    danswer_groups: list[ExternalUserGroup] = []
    for group_name in all_group_names:
        group_member_emails = _get_group_members_email_paginated(
            confluence_client, group_name
        )
        group_members = batch_add_non_web_user_if_not_exists__no_commit(
            db_session=db_session, emails=group_member_emails
        )
        if group_members:
            danswer_groups.append(
                ExternalUserGroup(
                    id=group_name, user_ids=[user.id for user in group_members]
                )
            )

    replace_user__ext_group_for_cc_pair__no_commit(
        db_session=db_session,
        cc_pair_id=cc_pair.id,
        group_defs=danswer_groups,
        source=cc_pair.connector.source,
    )
