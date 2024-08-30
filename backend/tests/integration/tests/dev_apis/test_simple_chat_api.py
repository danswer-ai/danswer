import requests

from danswer.configs.constants import MessageType
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.cc_pair import TestCCPair
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import NUM_DOCS
from tests.integration.common_utils.llm import LLMProviderManager
from tests.integration.common_utils.seed_documents import TestDocumentManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager


def test_send_message_simple_with_history(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # create connectors
    cc_pair_1: TestCCPair = CCPairManager.create_pair_from_scratch(
        user_performing_action=admin_user,
    )
    admin_user = TestDocumentManager.add_api_key_to_user(
        user=admin_user,
    )
    LLMProviderManager.create(user_performing_action=admin_user)
    cc_pair_1_seeded_docs = TestDocumentManager.seed_documents(
        num_docs=NUM_DOCS,
        cc_pair_id=cc_pair_1.id,
        user_with_api_key=admin_user,
    )

    response = requests.post(
        f"{API_SERVER_URL}/chat/send-message-simple-with-history",
        json={
            "messages": [
                {
                    "message": cc_pair_1_seeded_docs.documents[0].content,
                    "role": MessageType.USER.value,
                }
            ],
            "persona_id": 0,
            "prompt_id": 0,
        },
        headers=admin_user.headers,
    )
    assert response.status_code == 200

    response_json = response.json()

    # Check that the top document is the correct document
    assert (
        response_json["simple_search_docs"][0]["id"]
        == cc_pair_1_seeded_docs.documents[0].id
    )

    # assert that the metadata is correct
    for doc in cc_pair_1_seeded_docs.documents:
        found_doc = next(
            (x for x in response_json["simple_search_docs"] if x["id"] == doc.id), None
        )
        assert found_doc
        assert found_doc["metadata"]["document_id"] == doc.id
