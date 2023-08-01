from collections.abc import Generator
from typing import Any, Iterator

from danswer.chunking.models import InferenceChunk
from danswer.configs.model_configs import (
    GEN_AI_HUGGINGFACE_DISABLE_STREAM,
    GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL,
    GEN_AI_MAX_OUTPUT_TOKENS,
)
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import (
    ChatPromptProcessor,
    JsonChatProcessor,
    JsonProcessor,
)
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from huggingface_hub import InferenceClient

logger = setup_logger()


def _build_hf_inference_settings(**kwargs: Any) -> dict[str, Any]:
    """
    Utility to add in some common default values so they don't have to be set every time.
    """
    return {
        "do_sample": False,
        "seed": 69,  # For reproducibility
        **kwargs,
    }


def _generic_chat_dialog_to_prompt_formatter(dialog: list[dict[str, str]]) -> str:
    """
    Utility to convert chat dialog to a text-generation prompt for models tuned for chat.
    Note - This is a "best guess" attempt at a generic completions prompt for chat
    completion models. It isn't optimized for all chat trained models, but tries
    to serialize to a format that most models understand.
    Models like Llama2-chat have been optimized for certain formatting of chat
    completions, and this function doesn't take that into account, so you won't
    always get the best possible outcome.
    TODO - Add the ability to pass custom formatters for chat dialogue
    """
    DEFAULT_SYSTEM_PROMPT = """\
    You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.
    If a question does not make any sense or is not factually coherent, explain why instead of answering incorrectly.
    If you don't know the answer to a question, don't share false information."""
    prompt = ""
    if dialog[0]["role"] != "system":
        dialog = [
            {
                "role": "system",
                "content": DEFAULT_SYSTEM_PROMPT,
            }
        ] + dialog
    for message in dialog:
        prompt += f"{message['role'].upper()}: {message['content']}\n"
    prompt += "ASSISTANT:"
    return prompt


def _mock_streaming_response(tokens: str) -> Generator[str, None, None]:
    """Utility to mock a streaming response"""
    for token in tokens:
        yield token


class HuggingFaceInferenceCompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: NonChatPromptProcessor = JsonProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,
        api_key: str | None = None,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata
        self.client = InferenceClient(model=model_version, token=api_key)

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, list[DanswerQuote]]:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)
        model_output = self.client.text_generation(
            filled_prompt,
            **_build_hf_inference_settings(max_new_tokens=self.max_output_tokens),
        )
        logger.debug(model_output)
        answer, quotes_dict = process_answer(model_output, context_docs)
        return answer, quotes_dict

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)
        if not GEN_AI_HUGGINGFACE_DISABLE_STREAM:
            model_stream = self.client.text_generation(
                filled_prompt,
                **_build_hf_inference_settings(
                    max_new_tokens=self.max_output_tokens, stream=True
                ),
            )
        else:
            model_output = self.client.text_generation(
                filled_prompt,
                **_build_hf_inference_settings(max_new_tokens=self.max_output_tokens),
            )
            logger.debug(model_output)
            model_stream = _mock_streaming_response(model_output)
        yield from process_model_tokens(
            tokens=model_stream,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )


class HuggingFaceInferenceChatCompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: ChatPromptProcessor = JsonChatProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,
        api_key: str | None = None,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata
        self.client = InferenceClient(model=model_version, token=api_key)

    @staticmethod
    def convert_dialog_to_conversational_format(
        dialog: list[dict[str, str]]
    ) -> tuple[str, list[str], list[str]]:
        if dialog[-1]["role"] != "user":
            raise Exception(
                "Last message in conversational dialog must be User message"
            )
        user_message = dialog[-1]["content"]
        dialog = dialog[0:-1]
        generated_responses = []
        past_user_inputs = []
        for message in dialog:
            # HuggingFace inference client doesn't support system messages today
            # so lumping them in with user messages
            if message["role"] in ["user", "system"]:
                past_user_inputs += [message["content"]]
            else:
                generated_responses += [message["content"]]
        return user_message, generated_responses, past_user_inputs

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, list[DanswerQuote]]:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)
        if GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL:
            (
                message,
                generated_responses,
                past_user_inputs,
            ) = self.convert_dialog_to_conversational_format(filled_prompt)
            model_output = self.client.conversational(
                message,
                generated_responses=generated_responses,
                past_user_inputs=past_user_inputs,
                parameters={"max_length": self.max_output_tokens},
            )
        else:
            chat_prompt = _generic_chat_dialog_to_prompt_formatter(filled_prompt)
            logger.debug(chat_prompt)
            model_output = self.client.text_generation(
                chat_prompt,
                **_build_hf_inference_settings(max_new_tokens=self.max_output_tokens),
            )
        logger.debug(model_output)
        answer, quotes_dict = process_answer(model_output, context_docs)
        return answer, quotes_dict

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)
        if not GEN_AI_HUGGINGFACE_DISABLE_STREAM:
            if GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL:
                raise Exception(
                    "Conversational API is not available with streaming enabled. Please either "
                    + "disable streaming, or disable using conversational API."
                )
            chat_prompt = _generic_chat_dialog_to_prompt_formatter(filled_prompt)
            logger.debug(chat_prompt)
            model_stream = self.client.text_generation(
                chat_prompt,
                **_build_hf_inference_settings(
                    max_new_tokens=self.max_output_tokens, stream=True
                ),
            )
        else:
            if GEN_AI_HUGGINGFACE_USE_CONVERSATIONAL:
                (
                    message,
                    generated_responses,
                    past_user_inputs,
                ) = self.convert_dialog_to_conversational_format(filled_prompt)
                model_output = self.client.conversational(
                    message,
                    generated_responses=generated_responses,
                    past_user_inputs=past_user_inputs,
                    parameters={"max_length": self.max_output_tokens},
                )
            else:
                chat_prompt = _generic_chat_dialog_to_prompt_formatter(filled_prompt)
                logger.debug(chat_prompt)
                model_output = self.client.text_generation(
                    chat_prompt,
                    **_build_hf_inference_settings(
                        max_new_tokens=self.max_output_tokens
                    ),
                )
            logger.debug(model_output)
            model_stream = _mock_streaming_response(model_output)
        yield from process_model_tokens(
            tokens=model_stream,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )
