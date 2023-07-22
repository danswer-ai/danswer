import json
from collections.abc import Callable
from collections.abc import Generator
from functools import wraps
from typing import Any
from typing import cast
from typing import TypeVar

import openai
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import INCLUDE_METADATA
from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import ChatPromptProcessor
from danswer.direct_qa.qa_prompts import get_json_chat_reflexion_msg
from danswer.direct_qa.qa_prompts import JsonChatProcessor
from danswer.direct_qa.qa_prompts import JsonProcessor
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_utils import extract_quotes_from_completed_token_stream
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from openai.error import AuthenticationError
from openai.error import Timeout


logger = setup_logger()

F = TypeVar("F", bound=Callable)


def get_openai_api_key() -> str:
    return OPENAI_API_KEY or cast(
        str, get_dynamic_config_store().load(OPENAI_API_KEY_STORAGE_KEY)
    )


def _build_openai_settings(**kwargs: Any) -> dict[str, Any]:
    """
    Utility to add in some common default values so they don't have to be set every time.
    """
    return {
        "temperature": 0,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        **kwargs,
    }


def _handle_openai_exceptions_wrapper(openai_call: F, query: str) -> F:
    @wraps(openai_call)
    def wrapped_call(*args: list[Any], **kwargs: dict[str, Any]) -> Any:
        try:
            # if streamed, the call returns a generator
            if kwargs.get("stream"):

                def _generator() -> Generator[Any, None, None]:
                    yield from openai_call(*args, **kwargs)

                return _generator()
            return openai_call(*args, **kwargs)
        except AuthenticationError:
            logger.exception("Failed to authenticate with OpenAI API")
            raise
        except Timeout:
            logger.exception("OpenAI API timed out for query: %s", query)
            raise
        except Exception as e:
            logger.exception("Unexpected error with OpenAI API for query: %s", query)
            raise

    return cast(F, wrapped_call)


# used to check if the QAModel is an OpenAI model
class OpenAIQAModel(QAModel):
    pass


class OpenAICompletionQA(OpenAIQAModel):
    def __init__(
        self,
        prompt_processor: NonChatPromptProcessor = JsonProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        api_key: str | None = None,
        timeout: int | None = None,
        include_metadata: bool = INCLUDE_METADATA,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.model_version = model_version
        self.max_output_tokens = max_output_tokens
        self.timeout = timeout
        self.include_metadata = include_metadata
        try:
            self.api_key = api_key or get_openai_api_key()
        except ConfigNotFoundError:
            raise OpenAIKeyMissing()

    @staticmethod
    def _generate_tokens_from_response(response: Any) -> Generator[str, None, None]:
        for event in response:
            yield event["choices"][0]["text"]

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, DanswerQuote]:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)

        openai_call = _handle_openai_exceptions_wrapper(
            openai_call=openai.Completion.create,
            query=query,
        )
        response = openai_call(
            **_build_openai_settings(
                api_key=self.api_key,
                prompt=filled_prompt,
                model=self.model_version,
                max_tokens=self.max_output_tokens,
                request_timeout=self.timeout,
            ),
        )
        model_output = cast(str, response["choices"][0]["text"]).strip()
        logger.info("OpenAI Token Usage: " + str(response["usage"]).replace("\n", ""))
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

        openai_call = _handle_openai_exceptions_wrapper(
            openai_call=openai.Completion.create,
            query=query,
        )
        response = openai_call(
            **_build_openai_settings(
                api_key=self.api_key,
                prompt=filled_prompt,
                model=self.model_version,
                max_tokens=self.max_output_tokens,
                request_timeout=self.timeout,
                stream=True,
            ),
        )

        tokens = self._generate_tokens_from_response(response)

        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )


class OpenAIChatCompletionQA(OpenAIQAModel):
    def __init__(
        self,
        prompt_processor: ChatPromptProcessor = JsonChatProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        timeout: int | None = None,
        reflexion_try_count: int = 0,
        api_key: str | None = None,
        include_metadata: bool = INCLUDE_METADATA,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.model_version = model_version
        self.max_output_tokens = max_output_tokens
        self.reflexion_try_count = reflexion_try_count
        self.timeout = timeout
        self.include_metadata = include_metadata
        try:
            self.api_key = api_key or get_openai_api_key()
        except ConfigNotFoundError:
            raise OpenAIKeyMissing()

    @staticmethod
    def _generate_tokens_from_response(response: Any) -> Generator[str, None, None]:
        for event in response:
            event_dict = cast(dict[str, Any], event["choices"][0]["delta"])
            if (
                "content" not in event_dict
            ):  # could be a role message or empty termination
                continue
            yield event_dict["content"]

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> tuple[DanswerAnswer, DanswerQuote]:
        messages = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(json.dumps(messages, indent=4))
        model_output = ""
        for _ in range(self.reflexion_try_count + 1):
            openai_call = _handle_openai_exceptions_wrapper(
                openai_call=openai.ChatCompletion.create,
                query=query,
            )
            response = openai_call(
                **_build_openai_settings(
                    api_key=self.api_key,
                    messages=messages,
                    model=self.model_version,
                    max_tokens=self.max_output_tokens,
                    request_timeout=self.timeout,
                ),
            )
            model_output = cast(
                str, response["choices"][0]["message"]["content"]
            ).strip()
            assistant_msg = {"content": model_output, "role": "assistant"}
            messages.extend([assistant_msg, get_json_chat_reflexion_msg()])
            logger.info(
                "OpenAI Token Usage: " + str(response["usage"]).replace("\n", "")
            )

        logger.debug(model_output)

        answer, quotes_dict = process_answer(model_output, context_docs)
        return answer, quotes_dict

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        messages = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(json.dumps(messages, indent=4))

        openai_call = _handle_openai_exceptions_wrapper(
            openai_call=openai.ChatCompletion.create,
            query=query,
        )
        response = openai_call(
            **_build_openai_settings(
                api_key=self.api_key,
                messages=messages,
                model=self.model_version,
                max_tokens=self.max_output_tokens,
                request_timeout=self.timeout,
                stream=True,
            ),
        )

        tokens = self._generate_tokens_from_response(response)

        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )
