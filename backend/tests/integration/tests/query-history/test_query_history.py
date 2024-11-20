from datetime import datetime
from datetime import timedelta
from datetime import timezone

import requests

from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SessionType
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.managers.api_key import APIKeyManager
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.chat import ChatSessionManager
from tests.integration.common_utils.managers.document import DocumentManager
from tests.integration.common_utils.managers.llm_provider import LLMProviderManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestUser


def test_query_history_endpoints(reset: None) -> None:
    # Create admin user and required resources
    admin_user: DATestUser = UserManager.create(name="admin_user")
    cc_pair = CCPairManager.create_from_scratch(user_performing_action=admin_user)
    api_key = APIKeyManager.create(user_performing_action=admin_user)
    LLMProviderManager.create(user_performing_action=admin_user)

    # Seed a document
    cc_pair.documents = []
    cc_pair.documents.append(
        DocumentManager.seed_doc_with_content(
            cc_pair=cc_pair,
            content="The company's revenue in Q1 was $1M",
            api_key=api_key,
        )
    )

    # Create chat session and send a message
    chat_session = ChatSessionManager.create(
        persona_id=0,
        description="Test chat session",
        user_performing_action=admin_user,
    )

    ChatSessionManager.send_message(
        chat_session_id=chat_session.id,
        message="What was the Q1 revenue?",
        user_performing_action=admin_user,
    )

    # Test get chat session history endpoint
    end_time = datetime.now(tz=timezone.utc)
    start_time = end_time - timedelta(days=1)

    response = requests.get(
        f"{API_SERVER_URL}/admin/chat-session-history",
        params={
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
        },
        headers=admin_user.headers,
    )
    assert response.status_code == 200
    history_response = response.json()

    # Verify we got back the one chat session we created
    assert len(history_response) == 1

    # Verify the first chat session details
    first_session = history_response[0]
    first_chat_id = first_session["id"]
    assert first_session["user_email"] == admin_user.email
    assert first_session["name"] == "Test chat session"
    assert first_session["first_user_message"] == "What was the Q1 revenue?"
    assert first_session["first_ai_message"] is not None
    assert first_session["assistant_id"] == 0
    assert first_session["feedback_type"] is None
    assert first_session["flow_type"] == SessionType.CHAT.value
    assert first_session["conversation_length"] == 2  # User message + AI response

    # Test get specific chat session endpoint
    response = requests.get(
        f"{API_SERVER_URL}/admin/chat-session-history/{first_chat_id}",
        headers=admin_user.headers,
    )
    assert response.status_code == 200
    session_details = response.json()

    # Verify the session details
    assert session_details["id"] == first_chat_id
    assert len(session_details["messages"]) > 0
    assert session_details["flow_type"] == SessionType.CHAT.value

    # Test CSV export endpoint
    response = requests.get(
        f"{API_SERVER_URL}/admin/query-history-csv",
        headers=admin_user.headers,
    )
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "text/csv; charset=utf-8"
    assert "Content-Disposition" in response.headers

    # Verify CSV content
    csv_content = response.content.decode()
    assert "chat_session_id" in csv_content
    assert "user_message" in csv_content
    assert "ai_response" in csv_content

    # Test filtering by feedback
    response = requests.get(
        f"{API_SERVER_URL}/admin/chat-session-history",
        params={
            "feedback_type": QAFeedbackType.LIKE.value,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
        },
        headers=admin_user.headers,
    )
    assert response.status_code == 200
    history_response = response.json()
    assert len(history_response) == 0
