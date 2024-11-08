import os
import time
from typing import cast
from typing import List

import pytest

from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.jira_service_management.connector import JSMConnector
from danswer.connectors.models import Document


@pytest.fixture
def jsm_connector() -> JSMConnector:
    jsm_connector = JSMConnector(os.environ["JSM_PROJECT_ID"])
    jsm_connector.load_credentials(
        {
            "jsm_api_key": os.environ["JSM_API_TOKEN"],
            "jsm_email_id": os.environ["JSM_EMAIL_ID"],
            "jsm_domain_id": os.environ["JSM_DOMAIN_ID"],
        }
    )
    return jsm_connector


def test_jsm_connector_happy_path(jsm_connector: JSMConnector) -> None:
    domain: str = os.environ["JSM_DOMAIN_ID"]
    doc_batch_generator: GenerateDocumentsOutput = jsm_connector.poll_source(
        0, time.time()
    )
    doc_batch: List[Document] = next(doc_batch_generator)
    with pytest.raises(StopIteration):
        next(doc_batch_generator)
    assert len(doc_batch) == 2

    completed_task: Document
    ongoing_task: Document
    resolution: str = ""
    if isinstance(doc_batch[0].metadata.get("resolution", ""), str):
        resolution = cast(str, doc_batch[0].metadata["resolution"]).lower()

    completed_task, ongoing_task = (
        doc_batch if resolution == "done" else doc_batch[::-1]
    )

    assert cast(str, completed_task.title).lower() == "completed task"
    assert len(completed_task.sections) == 1
    assert (
        completed_task.sections[0].text.lower()
        == "this task will be moved to completed state.\ncomment: nothing to do. closing this task."
    )
    if isinstance(completed_task.metadata["label"], List):
        assert completed_task.metadata["label"] == ["testlabel"]
    if isinstance(completed_task.metadata["priority"], str):
        assert completed_task.metadata["priority"].lower() == "high"

    assert cast(str, ongoing_task.title).lower() == "pending task"
    assert len(ongoing_task.sections) == 1
    assert ongoing_task.sections[0].text.lower() == "this task is yet to be picked up."
    assert (
        ongoing_task.sections[0].link
        == f"https://{domain}.atlassian.net/rest/api/3/issue/{ongoing_task.id}"
    )
