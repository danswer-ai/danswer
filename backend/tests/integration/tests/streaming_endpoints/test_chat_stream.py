import json

import requests

from danswer.server.query_and_chat.models import ChatSessionCreationRequest
from danswer.server.query_and_chat.models import CreateChatMessageRequest
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.llm import LLMProviderManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestUser


def test_send_message_simple_with_history(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    LLMProviderManager.create(user_performing_action=admin_user)

    # Create a new chat session
    chat_session_creation_req = ChatSessionCreationRequest(
        persona_id=-1, description="Test chat session"
    )
    create_session_response = requests.post(
        f"{API_SERVER_URL}/chat/create-chat-session",
        json=chat_session_creation_req.model_dump(),
        headers=admin_user.headers,
    )
    assert create_session_response.status_code == 200
    chat_session_id = create_session_response.json()["chat_session_id"]

    parent_message_id = None  # This is the first message in the chat

    chat_message_req = CreateChatMessageRequest(
        chat_session_id=chat_session_id,
        parent_message_id=parent_message_id,
        message="hello",
        file_descriptors=[],
        prompt_id=0,
        search_doc_ids=[],
        retrieval_options=None,
        query_override=None,
        regenerate=None,
        llm_override=None,
        prompt_override=None,
        alternate_assistant_id=None,
        use_existing_user_message=False,
    )

    response = requests.post(
        f"{API_SERVER_URL}/chat/send-message",
        json=chat_message_req.model_dump(),
        headers=admin_user.headers,
        stream=True,
    )
    assert response.status_code == 200
    message = ""
    for line in response.iter_lines():
        if line:
            data = json.loads(line.decode("utf-8"))
            if "answer_piece" in data:
                message += data["answer_piece"]

    assert len(message) > 0
