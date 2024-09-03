from tests.integration.common_utils.llm import LLMProviderManager
from tests.integration.common_utils.managers.chat import ChatMessageManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestUser


def test_send_message_simple_with_history(reset: None) -> None:
    admin_user: TestUser = UserManager.create(name="admin_user")
    LLMProviderManager.create(user_performing_action=admin_user)

    test_chat_session = ChatMessageManager.create_chat_session(
        user_performing_action=admin_user
    )

    message = "hello"
    chat_message = ChatMessageManager.send_message(
        chat_session=test_chat_session,
        message=message,
        user_performing_action=admin_user,
    )

    assert len(chat_message.response) > 0
