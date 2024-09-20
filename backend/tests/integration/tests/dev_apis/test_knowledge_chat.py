import requests

from danswer.configs.constants import MessageType
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.llm import LLMProviderManager
from tests.integration.common_utils.managers.api_key import APIKeyManager
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.document import DocumentManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestAPIKey
from tests.integration.common_utils.test_models import TestCCPair
from tests.integration.common_utils.test_models import TestUser


def test_all_stream_chat_message_objects_outputs(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # create connector
    cc_pair_1: TestCCPair = CCPairManager.create_from_scratch(
        user_performing_action=admin_user,
    )
    api_key: TestAPIKey = APIKeyManager.create(
        user_performing_action=admin_user,
    )
    LLMProviderManager.create(user_performing_action=admin_user)

    # SEEDING DOCUMENTS
    cc_pair_1.documents = []
    cc_pair_1.documents.append(
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair_1,
            content="Pablo's favorite color is blue",
            api_key=api_key,
        )
    )
    cc_pair_1.documents.append(
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair_1,
            content="Chris's favorite color is red",
            api_key=api_key,
        )
    )
    cc_pair_1.documents.append(
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair_1,
            content="Pika's favorite color is green",
            api_key=api_key,
        )
    )

    # TESTING RESPONSE FOR QUESTION 1
    response = requests.post(
        f"{API_SERVER_URL}/chat/send-message-simple-with-history",
        json={
            "messages": [
                {
                    "message": "What is Pablo's favorite color?",
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

    # check that the answer is correct
    assert "blue" in response_json["answer"].lower()

    # check that the llm selected a document
    assert 0 in response_json["llm_selected_doc_indices"]

    # check that the final context documents are correct
    # (it should contain all documents because there arent enough to exclude any)
    assert 0 in response_json["final_context_doc_indices"]
    assert 1 in response_json["final_context_doc_indices"]
    assert 2 in response_json["final_context_doc_indices"]

    # check that the cited documents are correct
    assert cc_pair_1.documents[0].id in response_json["cited_documents"].values()

    # check that the top documents are correct
    assert response_json["top_documents"][0]["document_id"] == cc_pair_1.documents[0].id
    print("response 1/3 passed")

    # TESTING RESPONSE FOR QUESTION 2
    response = requests.post(
        f"{API_SERVER_URL}/chat/send-message-simple-with-history",
        json={
            "messages": [
                {
                    "message": "What is Chris's favorite color?",
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

    # check that the answer is correct
    assert "red" in response_json["answer"].lower()

    # check that the llm selected a document
    assert 0 in response_json["llm_selected_doc_indices"]

    # check that the final context documents are correct
    # (it should contain all documents because there arent enough to exclude any)
    assert 0 in response_json["final_context_doc_indices"]
    assert 1 in response_json["final_context_doc_indices"]
    assert 2 in response_json["final_context_doc_indices"]

    # check that the cited documents are correct
    assert cc_pair_1.documents[1].id in response_json["cited_documents"].values()

    # check that the top documents are correct
    assert response_json["top_documents"][0]["document_id"] == cc_pair_1.documents[1].id
    print("response 2/3 passed")

    # TESTING RESPONSE FOR QUESTION 3
    response = requests.post(
        f"{API_SERVER_URL}/chat/send-message-simple-with-history",
        json={
            "messages": [
                {
                    "message": "What is Pika's favorite color?",
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

    # check that the answer is correct
    assert "green" in response_json["answer"].lower()

    # check that the llm selected a document
    assert 0 in response_json["llm_selected_doc_indices"]

    # check that the final context documents are correct
    # (it should contain all documents because there arent enough to exclude any)
    assert 0 in response_json["final_context_doc_indices"]
    assert 1 in response_json["final_context_doc_indices"]
    assert 2 in response_json["final_context_doc_indices"]

    # check that the cited documents are correct
    assert cc_pair_1.documents[2].id in response_json["cited_documents"].values()

    # check that the top documents are correct
    assert response_json["top_documents"][0]["document_id"] == cc_pair_1.documents[2].id
    print("response 3/3 passed")
