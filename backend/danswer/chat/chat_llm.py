from collections.abc import Iterator

from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.llm.build import get_default_llm


def llm_chat_answer(previous_messages: list[ChatMessage]) -> Iterator[str]:
    prompt: list[BaseMessage] = []
    for msg in previous_messages:
        content = msg.message
        if msg.message_type == MessageType.SYSTEM:
            prompt.append(SystemMessage(content=content))
        if msg.message_type == MessageType.ASSISTANT:
            prompt.append(AIMessage(content=content))
        if (
            msg.message_type == MessageType.USER
            or msg.message_type == MessageType.DANSWER  # consider using FunctionMessage
        ):
            prompt.append(HumanMessage(content=content))

    return get_default_llm().stream(prompt)
