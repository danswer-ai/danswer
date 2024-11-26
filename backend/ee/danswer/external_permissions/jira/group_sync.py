from typing import Any

from danswer.connectors.confluence.onyx_confluence import build_confluence_client
from danswer.connectors.danswer_jira.utils import extract_jira_project
from danswer.db.models import ConnectorCredentialPair
from danswer.utils.logger import setup_logger
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.external_permissions.confluence.group_sync import (
    build_group_member_email_map,
)

logger = setup_logger()


def _convert_jira_credentials_to_confluence_credentials(
    jira_credentials: dict[str, Any]
) -> dict[str, Any]:
    return {
        # This one is optional in jira connector
        # (and probably should be optional in conflunece setup as well)
        "confluence_username": jira_credentials.get("jira_user_email"),
        # This one is not optional
        "confluence_access_token": jira_credentials["jira_api_token"],
    }


_POTENTIAL_CLOUD_DOMAINS = ["atlassian.net", "jira.com"]


def _determine_if_config_is_cloud(
    credentials: dict[str, Any],
    given_jira_url: str,
) -> bool:
    """
    This may not work if someone has a Jira Server instance that contains atlassian.net or jira.com
    in the URL.
    Or if someone has atlassian cloud instance that doesn't contain atlassian.net or jira.com
    """
    if not credentials.get("jira_user_email"):
        return False
    return any(domain in given_jira_url for domain in _POTENTIAL_CLOUD_DOMAINS)


def jira_group_sync(
    cc_pair: ConnectorCredentialPair,
) -> list[ExternalUserGroup]:
    """
    We use the existing confluence group sync helper functions because atlassian groups
    are shared between confluence and jira
    """
    jira_base_url, _ = extract_jira_project(
        cc_pair.connector.connector_specific_config["jira_project_url"]
    )

    confluence_credentials = _convert_jira_credentials_to_confluence_credentials(
        cc_pair.credential.credential_json
    )

    is_cloud = _determine_if_config_is_cloud(
        credentials=cc_pair.credential.credential_json,
        given_jira_url=jira_base_url,
    )

    confluence_client = build_confluence_client(
        credentials=confluence_credentials,
        is_cloud=is_cloud,
        wiki_base=jira_base_url,
        should_validate=False,
    )

    group_member_email_map = build_group_member_email_map(confluence_client)
    danswer_groups: list[ExternalUserGroup] = []
    for group_id, group_member_emails in group_member_email_map.items():
        danswer_groups.append(
            ExternalUserGroup(
                id=group_id,
                user_emails=list(group_member_emails),
            )
        )

    return danswer_groups
