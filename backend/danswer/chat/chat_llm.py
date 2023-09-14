from collections.abc import Iterator

from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.chat.models import ChatContext
from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.llm.build import get_default_llm


def llm_contextless_chat_answer(previous_messages: list[ChatMessage]) -> Iterator[str]:
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


def combine_chat_messages_into_single(messages: list[ChatMessage]) -> str:
    pass


def llm_contextual_chat_answer(
    previous_messages: list[ChatMessage], chat_context: ChatContext
) -> Iterator[str]:
    # LLMs do not follow context well across messages, so building a single message
    full_prompt = ""

    system_text = (
        chat_context.system_text if chat_context.system_text is not None else ""
    )
    tool_text = chat_context.tools_text if chat_context.tools_text is not None else ""
    chat_context.hint_text if chat_context.hint_text is not None else ""

    full_prompt = full_prompt + system_text + tool_text

    return get_default_llm().stream("TODO")


def llm_chat_answer(
    previous_messages: list[ChatMessage],
    contextual: bool,
    context: ChatContext,
) -> Iterator[str]:
    if not contextual:
        return llm_contextless_chat_answer(previous_messages)

    return llm_contextual_chat_answer(previous_messages, context)
