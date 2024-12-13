import json
import os
import time
from pathlib import Path

import pytest

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.zendesk.connector import ZendeskConnector


def load_test_data(file_name: str = "test_zendesk_data.json") -> dict[str, dict]:
    current_dir = Path(__file__).parent
    with open(current_dir / file_name, "r") as f:
        return json.load(f)


@pytest.fixture
def zendesk_article_connector() -> ZendeskConnector:
    connector = ZendeskConnector(content_type="articles")
    connector.load_credentials(get_credentials())
    return connector


@pytest.fixture
def zendesk_ticket_connector() -> ZendeskConnector:
    connector = ZendeskConnector(content_type="tickets")
    connector.load_credentials(get_credentials())
    return connector


def get_credentials() -> dict[str, str]:
    return {
        "zendesk_subdomain": os.environ["ZENDESK_SUBDOMAIN"],
        "zendesk_email": os.environ["ZENDESK_EMAIL"],
        "zendesk_token": os.environ["ZENDESK_TOKEN"],
    }


@pytest.mark.parametrize(
    "connector_fixture", ["zendesk_article_connector", "zendesk_ticket_connector"]
)
def test_zendesk_connector_basic(
    request: pytest.FixtureRequest, connector_fixture: str
) -> None:
    connector = request.getfixturevalue(connector_fixture)
    test_data = load_test_data()
    all_docs: list[Document] = []
    target_test_doc_id: str
    if connector.content_type == "articles":
        target_test_doc_id = f"article:{test_data['article']['id']}"
    else:
        target_test_doc_id = f"zendesk_ticket_{test_data['ticket']['id']}"

    target_doc: Document | None = None

    for doc_batch in connector.poll_source(0, time.time()):
        for doc in doc_batch:
            all_docs.append(doc)
            if doc.id == target_test_doc_id:
                target_doc = doc

    assert len(all_docs) > 0, "No documents were retrieved from the connector"
    assert (
        target_doc is not None
    ), "Target document was not found in the retrieved documents"
    assert target_doc.source == DocumentSource.ZENDESK, "Document source is not ZENDESK"

    if connector.content_type == "articles":
        print(f"target_doc.semantic_identifier {target_doc.semantic_identifier}")
        assert (
            target_doc.semantic_identifier
            == test_data["article"]["semantic_identifier"]
        ), "Article title does not match"
    else:
        assert target_doc.semantic_identifier.startswith(
            f"Ticket #{test_data['ticket']['id']}"
        ), "Ticket ID does not match"


def test_zendesk_connector_slim(zendesk_article_connector: ZendeskConnector) -> None:
    # Get full doc IDs
    all_full_doc_ids = set()
    for doc_batch in zendesk_article_connector.load_from_state():
        all_full_doc_ids.update([doc.id for doc in doc_batch])

    # Get slim doc IDs
    all_slim_doc_ids = set()
    for slim_doc_batch in zendesk_article_connector.retrieve_all_slim_documents():
        all_slim_doc_ids.update([doc.id for doc in slim_doc_batch])

    # Full docs should be subset of slim docs
    assert all_full_doc_ids.issubset(
        all_slim_doc_ids
    ), f"Full doc IDs {all_full_doc_ids} not subset of slim doc IDs {all_slim_doc_ids}"
