from danswer.configs.constants import MessageType
from danswer.llm.answering.models import PreviousMessage


def create_previous_message(
    assistant_content: str, token_count: int
) -> PreviousMessage:
    return PreviousMessage(
        message=assistant_content,
        message_type=MessageType.ASSISTANT,
        token_count=token_count,
        files=[],
        tool_call=None,
    )
