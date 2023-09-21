from collections.abc import Callable
from collections.abc import Iterator
from typing import Any

import tiktoken
from langchain.prompts.base import StringPromptValue
from langchain.prompts.chat import ChatPromptValue
from langchain.schema import PromptValue
from langchain.schema.language_model import LanguageModelInput
from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import BaseMessageChunk
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.app_configs import LOG_LEVEL
from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage


_LLM_TOKENIZER: Callable[[str], Any] | None = None


def get_default_llm_tokenizer() -> Callable:
    global _LLM_TOKENIZER
    if _LLM_TOKENIZER is None:
        _LLM_TOKENIZER = tiktoken.get_encoding("cl100k_base").encode
    return _LLM_TOKENIZER


def translate_danswer_msg_to_langchain(msg: ChatMessage) -> BaseMessage:
    if (
        msg.message_type == MessageType.SYSTEM
        or msg.message_type == MessageType.DANSWER
    ):
        # TODO save at least the Danswer responses to postgres
        raise ValueError(
            "System and Danswer messages are not currently part of history"
        )
    if msg.message_type == MessageType.ASSISTANT:
        return AIMessage(content=msg.message)
    if msg.message_type == MessageType.USER:
        return HumanMessage(content=msg.message)

    raise ValueError(f"New message type {msg.message_type} not handled")


def dict_based_prompt_to_langchain_prompt(
    messages: list[dict[str, str]]
) -> list[BaseMessage]:
    prompt: list[BaseMessage] = []
    for message in messages:
        role = message.get("role")
        content = message.get("content")
        if not role:
            raise ValueError(f"Message missing `role`: {message}")
        if not content:
            raise ValueError(f"Message missing `content`: {message}")
        elif role == "user":
            prompt.append(HumanMessage(content=content))
        elif role == "system":
            prompt.append(SystemMessage(content=content))
        elif role == "assistant":
            prompt.append(AIMessage(content=content))
        else:
            raise ValueError(f"Unknown role: {role}")
    return prompt


def str_prompt_to_langchain_prompt(message: str) -> list[BaseMessage]:
    return [HumanMessage(content=message)]


def message_generator_to_string_generator(
    messages: Iterator[BaseMessageChunk],
) -> Iterator[str]:
    for message in messages:
        yield message.content


def convert_input(lm_input: LanguageModelInput) -> str:
    """Heavily inspired by:
    https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chat_models/base.py#L86
    """
    prompt_value = None
    if isinstance(lm_input, PromptValue):
        prompt_value = lm_input
    elif isinstance(lm_input, str):
        prompt_value = StringPromptValue(text=lm_input)
    elif isinstance(lm_input, list):
        prompt_value = ChatPromptValue(messages=lm_input)

    if prompt_value is None:
        raise ValueError(
            f"Invalid input type {type(lm_input)}. "
            "Must be a PromptValue, str, or list of BaseMessages."
        )

    return prompt_value.to_string()


def should_be_verbose() -> bool:
    return LOG_LEVEL == "debug"


def check_number_of_tokens(
    text: str, encode_fn: Callable[[str], list] | None = None
) -> int:
    """Get's the number of tokens in the provided text, using the provided encoding
    function. If none is provided, default to the tiktoken encoder used by GPT-3.5
    and GPT-4.
    """

    if encode_fn is None:
        encode_fn = tiktoken.get_encoding("cl100k_base").encode

    return len(encode_fn(text))
