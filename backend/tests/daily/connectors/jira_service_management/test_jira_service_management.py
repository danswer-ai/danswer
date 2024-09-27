import os
import time
from unittest.mock import MagicMock, patch

import pytest

from danswer.connectors.jira_service_management.connector import JiraServiceManagementConnector



@patch("danswer.connectors.jira_service_management.connector._make_query")
def test_connector_basic(mock_query_response: MagicMock):
    mock_query_response.return_value = {
        "startAt":0,
        "maxResults":16,
        "issues":[
            {
                "id": "10001",
                "key": "TEST-PROJECT-1",
                "fields": {
                    "summary": "Issue summary 1",
                    "status": {
                    "name": "In Progress"
                    }
                }
            },
        ]
    }
    connector = JiraServiceManagementConnector("https://test_domain_xyets.atlassian.net","TEST")
    connector.load_credentials(
        {
            "email":"test_email_xyets@testeremail.com",
            "api_token":"ojsojsdodjosjodjojdojsojdo"
        }
    )
    docs_batch_generator = connector.poll_source(0, time.time())
    batch_1 = next(docs_batch_generator)

    with pytest.raises(StopIteration):
        next(docs_batch_generator)

    assert len(batch_1) == 1
    doc = batch_1[0]

    assert doc.semantic_identifier == "Issue summary 1"
    assert doc.metadata["status"] == "In Progress"
    assert len(doc.sections) == 1

    section = doc.sections[0]
    assert section.text == "Issue summary 1"
    assert (
        section.link
        == "https://test_domain_xyets.atlassian.net/browse/TEST-PROJECT-1"
    )