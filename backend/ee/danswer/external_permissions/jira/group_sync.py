from jira import JIRA
from sqlalchemy.orm import Session

from danswer.connectors.danswer_jira.utils import build_jira_client
from danswer.connectors.danswer_jira.utils import extract_jira_project
from danswer.db.models import ConnectorCredentialPair
from danswer.db.users import batch_add_non_web_user_if_not_exists__no_commit
from danswer.utils.logger import setup_logger
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.db.external_perm import replace_user__ext_group_for_cc_pair__no_commit

logger = setup_logger()


def _get_group_members_email(jira_client: JIRA, group_name: str) -> list[str]:
    members = []
    query_params = {"groupname": group_name, "expand": "users"}
    group_dict = jira_client._get_json("group", params=query_params)
    member_dicts = group_dict.get("users", {}).get("items", [])
    for member in member_dicts:
        if member.get("emailAddress"):
            members.append(member.get("emailAddress"))
    return members


def jira_group_sync(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> None:
    """
    TODO: Combine this with confluence one to use the fact that all atlassian
    products use the same groups
    """
    jira_base, _ = extract_jira_project(
        cc_pair.connector.connector_specific_config["jira_project_url"]
    )
    jira_client = build_jira_client(
        credentials=cc_pair.credential.credential_json, jira_base=jira_base
    )

    danswer_groups: list[ExternalUserGroup] = []
    # Atlassian enforces that group names are unique
    for group_name in jira_client.groups():
        group_member_emails = _get_group_members_email(jira_client, group_name)
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
