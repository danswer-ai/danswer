import json
from collections.abc import Callable
from collections.abc import Iterator
from typing import Any
from typing import cast
from typing import TYPE_CHECKING
from typing import Union

import litellm  # type: ignore
import tiktoken
from langchain.prompts.base import StringPromptValue
from langchain.prompts.chat import ChatPromptValue
from langchain.schema import AIMessage
from langchain.schema import BaseMessage
from langchain.schema import HumanMessage
from langchain.schema import PromptValue
from langchain.schema.language_model import LanguageModelInput
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import MessageType
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MAX_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_PROVIDER
from danswer.db.models import ChatMessage
from danswer.file_store.models import ChatFileType
from danswer.file_store.models import InMemoryChatFile
from danswer.llm.interfaces import LLM
from danswer.prompts.constants import CODE_BLOCK_PAT
from danswer.utils.logger import setup_logger
from shared_configs.configs import LOG_LEVEL


if TYPE_CHECKING:
    from danswer.llm.answering.models import PreviousMessage

logger = setup_logger()

# def translate_danswer_msg_to_langchain(
#     msg: Union[ChatMessage, "PreviousMessage"]
# ) -> BaseMessage:
#     files: list[InMemoryChatFile] = []

#     # If the message is a `ChatMessage`, it doesn't have the downloaded files
#     # attached. Just ignore them for now. Also, OpenAI doesn't allow files to
#     # be attached to AI messages, so we must remove them
#     if not isinstance(msg, ChatMessage) and msg.message_type != MessageType.ASSISTANT:
#         files = msg.files
#     content = build_content_with_imgs(msg.message, files)

#     if msg.message_type == MessageType.SYSTEM:
#         print("SYSTE MESAGE")
#         print(msg.message)
#         # raise ValueError("System messages are not currently part of history")
#     if msg.message_type == MessageType.ASSISTANT:
#         return AIMessage(content=content)
#     if msg.message_type == MessageType.USER:
#         return HumanMessage(content=content)


def translate_danswer_msg_to_langchain(
    msg: Union[ChatMessage, "PreviousMessage"], token_count: int
) -> BaseMessage:
    content = msg.message

    if msg.message_type == MessageType.SYSTEM:
        return SystemMessage(content=content)
    wrapped_content = ""
    if msg.message_type == MessageType.ASSISTANT:
        try:
            parsed_content = json.loads(content)
            if (
                "name" in parsed_content
                and parsed_content["name"] == "run_image_generation"
            ):
                wrapped_content += f"I, the AI, am now generating an \
                image based on the prompt: '{parsed_content['args']['prompt']}'\n"
                wrapped_content += "[/AI IMAGE GENERATION REQUEST]"
            elif (
                "id" in parsed_content
                and parsed_content["id"] == "image_generation_response"
            ):
                wrapped_content += "I, the AI, have generated the following image(s) based on the previous request:\n"
                for img in parsed_content["response"]:
                    wrapped_content += f"- Description: {img['revised_prompt']}\n"
                    wrapped_content += f"  Image URL: {img['url']}\n\n"
                wrapped_content += "[/AI IMAGE GENERATION RESPONSE]"
            else:
                wrapped_content = content
        except json.JSONDecodeError:
            wrapped_content = content
        return AIMessage(content=wrapped_content)

    if msg.message_type == MessageType.USER:
        return HumanMessage(content=content)

    raise ValueError(f"New message type {msg.message_type} not handled")


def translate_history_to_basemessages(
    history: list[ChatMessage] | list["PreviousMessage"],
) -> tuple[list[BaseMessage], list[int]]:
    print("message history is")
    new_history = []
    assistant_content = None
    token_count = 1
    from danswer.llm.temporary import create_previous_message
    from danswer.tools.tool import ToolRegistry
    from danswer.llm.answering.models import PreviousMessage

    for i, msg in enumerate(history):
        message = cast(ChatMessage, msg)
        if message.message_type != MessageType.ASSISTANT:
            if assistant_content is not None:
                combined_ai_message = create_previous_message(
                    assistant_content, token_count
                )
                assistant_content = None
                new_history.append(combined_ai_message)
            new_history.append(cast(PreviousMessage, message))
            continue

        if message.tool_call and message.tool_call.tool_name == "run_image_generation":
            assistant_content = (assistant_content or "") + ToolRegistry.get_prompt(
                "run_image_generation", message
            )

            # assistant_content = assistant_content or "" +  f"I generated images with these descriptions! {message.message}"
        else:
            assistant_content = message.message

            # TODO make better + fix token counting
    if assistant_content is not None:
        combined_ai_message = create_previous_message(assistant_content, token_count)
        new_history.append(combined_ai_message)

    history = new_history
    for h in history:
        print(f"\t\t{h.message_type}: \t\t|| {h.message[:100]}\n\n")

    history_basemessages = [
        translate_danswer_msg_to_langchain(msg, 0)
        for msg in history
        if msg.token_count != 0
    ]

    history_token_counts = [msg.token_count for msg in history if msg.token_count != 0]
    # summary = "[CONVERSATION SUMMARY]\n"
    # summary += "The most recent user request may involve generating additional images. "
    # summary += "I should carefully review the conversation history an
    # d the latest user request and almost defeinitely GENERATE MORE IMAGES "
    # summary += "[/CONVERSATION SUMMARY]"
    # history_basemessages.append(AIMessage(content=summary))
    # history_token_counts.append(100)
    # print()
    for msg in history_basemessages:
        print(f"{msg.type} : \t \t ||||||||| {msg.content[:20]}")

        # print(f"{msg.type}: {msg.content[:20]}")

    return history_basemessages, history_token_counts


# def translate_history_to_basemessages(
#     history: Union[list[ChatMessage], list["PreviousMessage"]]
# ) -> tuple[list[BaseMessage], list[int]]:
#     history_basemessages = []
#     history_token_counts = []
#     image_generation_count = 0

#     for msg in history:
#         if msg.token_count != 0:
#             translated_msg = translate_danswer_msg_to_langchain(
#                 msg, image_generation_count
#             )
#             if (
#                 isinstance(translated_msg.content, str)
#                 and "[ImageGenerationRe" in translated_msg.content
#             ):
#                 image_generation_count += 1
#             history_basemessages.append(translated_msg)
#             history_token_counts.append(msg.token_count)

#     # Add a generic summary message at the end
#     summary = "[CONVERSATION SUMMARY]\n"
#     summary += "The most recent user request may involve generating additional images. "
#     summary += "I should carefully review the conversation history and the latest user request "
#     summary += (
#         "to determine if any new images need to be generated, ensuring I don't repeat "
#     )
#     summary += "any image generations that have already been completed.\n"
#     summary += f"I already generated {image_generation_count} images thus far. I should keep my responses EXTREMELY SHORT"
#     summary += "[/CONVERSATION SUMMARY]"
#     history_basemessages.append(AIMessage(content=summary))
#     history_token_counts.append(100)

#     return history_basemessages, history_token_counts


def _build_content(
    message: str,
    files: list[InMemoryChatFile] | None = None,
) -> str:
    """Applies all non-image files."""
    text_files = (
        [file for file in files if file.file_type == ChatFileType.PLAIN_TEXT]
        if files
        else None
    )
    if not text_files:
        return message

    final_message_with_files = "FILES:\n\n"
    for file in text_files:
        file_content = file.content.decode("utf-8")
        file_name_section = f"DOCUMENT: {file.filename}\n" if file.filename else ""
        final_message_with_files += (
            f"{file_name_section}{CODE_BLOCK_PAT.format(file_content.strip())}\n\n\n"
        )
    final_message_with_files += message

    return final_message_with_files


def build_content_with_imgs(
    message: str,
    files: list[InMemoryChatFile] | None = None,
    img_urls: list[str] | None = None,
) -> str | list[str | dict[str, Any]]:  # matching Langchain's BaseMessage content type
    files = files or []
    img_files = [file for file in files if file.file_type == ChatFileType.IMAGE]
    img_urls = img_urls or []
    message_main_content = _build_content(message, files)

    if not img_files and not img_urls:
        return message_main_content

    return cast(
        list[str | dict[str, Any]],
        [
            {
                "type": "text",
                "text": message_main_content,
            },
        ]
        + [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{file.to_base64()}",
                },
            }
            for file in files
            if file.file_type == "image"
        ]
        # + [
        #     {
        #         "type": "image_url",
        #         "image_url": {
        #             "url": url,
        #         },
        #     }
        #     for url in img_urls
        # ],
    )


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


def convert_lm_input_to_basic_string(lm_input: LanguageModelInput) -> str:
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


def message_to_string(message: BaseMessage) -> str:
    if not isinstance(message.content, str):
        raise RuntimeError("LLM message not in expected format.")

    return message.content


def message_generator_to_string_generator(
    messages: Iterator[BaseMessage],
) -> Iterator[str]:
    for message in messages:
        yield message_to_string(message)


def should_be_verbose() -> bool:
    return LOG_LEVEL == "debug"


# estimate of the number of tokens in an image url
# is correct when downsampling is used. Is very wrong when OpenAI does not downsample
# TODO: improve this
_IMG_TOKENS = 85


def check_message_tokens(
    message: BaseMessage, encode_fn: Callable[[str], list] | None = None
) -> int:
    if isinstance(message.content, str):
        return check_number_of_tokens(message.content, encode_fn)

    total_tokens = 0
    for part in message.content:
        if isinstance(part, str):
            total_tokens += check_number_of_tokens(part, encode_fn)
            continue

        if part["type"] == "text":
            total_tokens += check_number_of_tokens(part["text"], encode_fn)
        elif part["type"] == "image_url":
            total_tokens += _IMG_TOKENS

    if isinstance(message, AIMessage) and message.tool_calls:
        for tool_call in message.tool_calls:
            total_tokens += check_number_of_tokens(
                json.dumps(tool_call["args"]), encode_fn
            )
            total_tokens += check_number_of_tokens(tool_call["name"], encode_fn)

    return total_tokens


def check_number_of_tokens(
    text: str, encode_fn: Callable[[str], list] | None = None
) -> int:
    """Gets the number of tokens in the provided text, using the provided encoding
    function. If none is provided, default to the tiktoken encoder used by GPT-3.5
    and GPT-4.
    """

    if encode_fn is None:
        encode_fn = tiktoken.get_encoding("cl100k_base").encode

    return len(encode_fn(text))


def test_llm(llm: LLM) -> str | None:
    # try for up to 2 timeouts (e.g. 10 seconds in total)
    error_msg = None
    for _ in range(2):
        try:
            llm.invoke("Do not respond")
            return None
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Failed to call LLM with the following error: {error_msg}")

    return error_msg


def get_llm_max_tokens(
    model_map: dict,
    model_name: str,
    model_provider: str = GEN_AI_MODEL_PROVIDER,
) -> int:
    """Best effort attempt to get the max tokens for the LLM"""
    if GEN_AI_MAX_TOKENS:
        # This is an override, so always return this
        return GEN_AI_MAX_TOKENS

    try:
        model_obj = model_map.get(f"{model_provider}/{model_name}")
        if not model_obj:
            model_obj = model_map[model_name]

        if "max_input_tokens" in model_obj:
            return model_obj["max_input_tokens"]

        if "max_tokens" in model_obj:
            return model_obj["max_tokens"]

        raise RuntimeError("No max tokens found for LLM")
    except Exception:
        logger.exception(
            f"Failed to get max tokens for LLM with name {model_name}. Defaulting to 4096."
        )
        return 4096


def get_max_input_tokens(
    model_name: str,
    model_provider: str,
    output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
) -> int:
    # NOTE: we previously used `litellm.get_max_tokens()`, but despite the name, this actually
    # returns the max OUTPUT tokens. Under the hood, this uses the `litellm.model_cost` dict,
    # and there is no other interface to get what we want. This should be okay though, since the
    # `model_cost` dict is a named public interface:
    # https://litellm.vercel.app/docs/completion/token_usage#7-model_cost
    # model_map is  litellm.model_cost
    litellm_model_map = litellm.model_cost

    input_toks = (
        get_llm_max_tokens(
            model_name=model_name,
            model_provider=model_provider,
            model_map=litellm_model_map,
        )
        - output_tokens
    )

    if input_toks <= 0:
        raise RuntimeError("No tokens for input for the LLM given settings")

    return input_toks
