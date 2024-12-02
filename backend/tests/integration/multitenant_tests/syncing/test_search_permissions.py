from danswer.db.models import UserRole
from tests.integration.common_utils.managers.api_key import APIKeyManager
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.chat import ChatSessionManager
from tests.integration.common_utils.managers.document import DocumentManager
from tests.integration.common_utils.managers.llm_provider import LLMProviderManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestAPIKey
from tests.integration.common_utils.test_models import DATestCCPair
from tests.integration.common_utils.test_models import DATestChatSession
from tests.integration.common_utils.test_models import DATestUser


def test_multi_tenant_access_control(reset_multitenant: None) -> None:
    # Create Tenants and Admin Users
    test_user1: DATestUser = UserManager.create(name="test1", email="test_1@test.com")
    test_user2: DATestUser = UserManager.create(name="test2", email="test_2@test.com")

    assert UserManager.verify_role(test_user1, UserRole.ADMIN)
    assert UserManager.verify_role(test_user2, UserRole.ADMIN)

    # Create connectors and seed documents for Tenant 1
    cc_pair_1: DATestCCPair = CCPairManager.create_from_scratch(
        user_performing_action=test_user1
    )
    api_key_1: DATestAPIKey = APIKeyManager.create(user_performing_action=test_user1)
    api_key_1.headers.update(test_user1.headers)
    LLMProviderManager.create(user_performing_action=test_user1)

    cc_pair_1.documents = []
    docs_tenant1 = [
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair_1, content="Tenant 1 Document Content", api_key=api_key_1
        )
        for _ in range(2)
    ]
    cc_pair_1.documents.extend(docs_tenant1)

    # Create connectors and seed documents for Tenant 2
    cc_pair_2: DATestCCPair = CCPairManager.create_from_scratch(
        user_performing_action=test_user2
    )
    api_key_2: DATestAPIKey = APIKeyManager.create(user_performing_action=test_user2)
    api_key_2.headers.update(test_user2.headers)
    LLMProviderManager.create(user_performing_action=test_user2)

    cc_pair_2.documents = []
    docs_tenant2 = [
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair_2, content="Tenant 2 Document Content", api_key=api_key_2
        )
        for _ in range(2)
    ]
    cc_pair_2.documents.extend(docs_tenant2)

    tenant1_doc_ids = {doc.id for doc in docs_tenant1}
    tenant2_doc_ids = {doc.id for doc in docs_tenant2}

    # Create chat sessions for each user
    chat_session1: DATestChatSession = ChatSessionManager.create(
        user_performing_action=test_user1
    )
    chat_session2: DATestChatSession = ChatSessionManager.create(
        user_performing_action=test_user2
    )

    # Test access for Tenant 1
    response1 = ChatSessionManager.send_message(
        chat_session_id=chat_session1.id,
        message="What is in Tenant 1's documents?",
        user_performing_action=test_user1,
    )
    assert response1.tool_name == "run_search"
    response1_doc_ids = {doc["document_id"] for doc in response1.tool_result or []}
    assert tenant1_doc_ids.issubset(
        response1_doc_ids
    ), "Not all Tenant 1 document IDs are in the response"
    assert not response1_doc_ids.intersection(
        tenant2_doc_ids
    ), "Tenant 2's document IDs should not be in the response"
    for doc in response1.tool_result or []:
        assert doc["content"] == "Tenant 1 Document Content"

    # Test access for Tenant 2
    response2 = ChatSessionManager.send_message(
        chat_session_id=chat_session2.id,
        message="What is in Tenant 2's documents?",
        user_performing_action=test_user2,
    )
    assert response2.tool_name == "run_search"
    response2_doc_ids = {doc["document_id"] for doc in response2.tool_result or []}
    assert tenant2_doc_ids.issubset(
        response2_doc_ids
    ), "Not all Tenant 2 document IDs are in the response"
    assert not response2_doc_ids.intersection(
        tenant1_doc_ids
    ), "Tenant 1's document IDs should not be in the response"
    for doc in response2.tool_result or []:
        assert doc["content"] == "Tenant 2 Document Content"

    # Test cross-tenant access attempts
    response_cross1 = ChatSessionManager.send_message(
        chat_session_id=chat_session1.id,
        message="What is in Tenant 2's documents?",
        user_performing_action=test_user1,
    )
    assert response_cross1.tool_name == "run_search"
    response_cross1_doc_ids = {
        doc["document_id"] for doc in response_cross1.tool_result or []
    }
    assert not response_cross1_doc_ids.intersection(
        tenant2_doc_ids
    ), "Tenant 2's document IDs should not be in the response"

    response_cross2 = ChatSessionManager.send_message(
        chat_session_id=chat_session2.id,
        message="What is in Tenant 1's documents?",
        user_performing_action=test_user2,
    )
    assert response_cross2.tool_name == "run_search"
    response_cross2_doc_ids = {
        doc["document_id"] for doc in response_cross2.tool_result or []
    }
    assert not response_cross2_doc_ids.intersection(
        tenant1_doc_ids
    ), "Tenant 1's document IDs should not be in the response"
