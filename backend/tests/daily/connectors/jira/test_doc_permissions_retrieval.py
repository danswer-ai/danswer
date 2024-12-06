import os
from unittest.mock import MagicMock

import pytest

from danswer.access.models import DocExternalAccess
from danswer.db.models import ConnectorCredentialPair
from ee.danswer.external_permissions.jira.doc_sync import jira_doc_sync


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
def test_jira_doc_sync(mock_jira_cc_pair: ConnectorCredentialPair) -> None:
    retrieved_docs: list[DocExternalAccess] = jira_doc_sync(mock_jira_cc_pair)

    assert len(retrieved_docs) == 1

    main_issue = retrieved_docs[0]
    assert main_issue.doc_id == "https://danswerai.atlassian.net/browse/AS-2"
    assert main_issue.external_access.external_user_emails == {
        "chris@danswer.ai",
        "hagen@danswer.ai",
    }
