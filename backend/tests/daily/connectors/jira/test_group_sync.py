import os
from unittest.mock import MagicMock

import pytest

from danswer.db.models import ConnectorCredentialPair
from ee.danswer.db.external_perm import ExternalUserGroup
from ee.danswer.external_permissions.jira.group_sync import jira_group_sync


@pytest.fixture
def mock_jira_cc_pair() -> ConnectorCredentialPair:
    mock_cc_pair = MagicMock(spec=ConnectorCredentialPair)
    mock_cc_pair.connector.connector_specific_config = {
        "jira_project_url": "https://danswerai.atlassian.net/jira/software/c/projects/AS/boards/6"
    }
    mock_cc_pair.credential.credential_json = {
        "jira_user_email": os.environ["JIRA_USER_EMAIL"],
        "jira_api_token": os.environ["JIRA_API_TOKEN"],
    }
    return mock_cc_pair


# remove this once it's setup for our test accounts
@pytest.mark.xfail(reason="This is set up to our dev instance which may cause flakes")
def test_jira_group_sync(mock_jira_cc_pair: ConnectorCredentialPair) -> None:
    retrieved_groups: list[ExternalUserGroup] = jira_group_sync(mock_jira_cc_pair)

    assert len(retrieved_groups) == 6

    expected_groups: dict[str, set[str]] = {
        "org-admins": {"chris@danswer.ai"},
        "jira-users-danswerai": {"chris@danswer.ai", "hagen@danswer.ai"},
        "jira-admins-danswerai": {"hagen@danswer.ai"},
        "confluence-user-access-admins-danswerai": {"hagen@danswer.ai"},
        "jira-user-access-admins-danswerai": {"hagen@danswer.ai"},
        "confluence-users-danswerai": {"chris@danswer.ai", "hagen@danswer.ai"},
    }

    for group in retrieved_groups:
        assert group.id in expected_groups
        assert set(group.user_emails) == expected_groups[group.id]
