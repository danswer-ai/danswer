from collections.abc import Iterator

from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import Persona
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
    combined_str = ""
    for message in messages:
        if message.message_type == MessageType.USER:
            combined_str = (
                combined_str
                + "\nUser Message:"
                + CODE_BLOCK_PAT.format(message.message)
            )
        if message.message_type == MessageType.ASSISTANT:
            combined_str = (
                combined_str + "\nAI Message:" + CODE_BLOCK_PAT.format(message.message)
            )

    return combined_str


def llm_contextual_chat_answer(
    previous_messages: list[ChatMessage],
    persona: Persona,
) -> Iterator[str]:
    # LLMs do not follow context well across messages, so building a single message
    system_text = persona.system_text if persona.system_text is not None else ""
    tool_text = persona.tools_text if persona.tools_text is not None else ""
    hint_text = persona.hint_text if persona.hint_text is not None else ""

    full_prompt = (
        system_text
        + tool_text
        + combine_chat_messages_into_single(previous_messages)
        + hint_text
    )

    return get_default_llm().stream(full_prompt)


def llm_chat_answer(
    previous_messages: list[ChatMessage],
    persona: Persona | None,
) -> Iterator[str]:
    if persona is None:
        return llm_contextless_chat_answer(previous_messages)

    return llm_contextual_chat_answer(previous_messages, persona)
