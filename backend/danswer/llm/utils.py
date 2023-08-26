from collections.abc import Iterator

from langchain.prompts.base import StringPromptValue
from langchain.prompts.chat import ChatPromptValue
from langchain.schema import (
    PromptValue,
)
from langchain.schema.language_model import LanguageModelInput
from langchain.schema.messages import BaseMessageChunk

from danswer.configs.app_configs import LOG_LEVEL


def message_generator_to_string_generator(
    messages: Iterator[BaseMessageChunk],
) -> Iterator[str]:
    for message in messages:
        yield message.content


def convert_input(input: LanguageModelInput) -> str:
    """Heavily inspired by:
    https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/chat_models/base.py#L86
    """
    prompt_value = None
    if isinstance(input, PromptValue):
        prompt_value = input
    elif isinstance(input, str):
        prompt_value = StringPromptValue(text=input)
    elif isinstance(input, list):
        prompt_value = ChatPromptValue(messages=input)

    if prompt_value is None:
        raise ValueError(
            f"Invalid input type {type(input)}. "
            "Must be a PromptValue, str, or list of BaseMessages."
        )

    return prompt_value.to_string()


def should_be_verbose() -> bool:
    return LOG_LEVEL == "debug"
