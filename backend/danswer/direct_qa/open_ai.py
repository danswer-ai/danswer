from abc import ABC
from collections.abc import Callable
from collections.abc import Generator
from copy import copy
from functools import wraps
from typing import Any
from typing import cast
from typing import TypeVar

import openai
import tiktoken
from openai.error import AuthenticationError
from openai.error import Timeout

from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import INCLUDE_METADATA
from danswer.configs.model_configs import API_BASE_OPENAI
from danswer.configs.model_configs import API_TYPE_OPENAI
from danswer.configs.model_configs import API_VERSION_OPENAI
from danswer.configs.model_configs import AZURE_DEPLOYMENT_ID
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_prompts import JsonProcessor
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time


logger = setup_logger()

F = TypeVar("F", bound=Callable)


if API_BASE_OPENAI:
    openai.api_base = API_BASE_OPENAI
if API_TYPE_OPENAI in ["azure"]:  # TODO: Azure AD support ["azure_ad", "azuread"]
    openai.api_type = API_TYPE_OPENAI
    openai.api_version = API_VERSION_OPENAI


def _ensure_openai_api_key(api_key: str | None) -> str:
    try:
        return api_key or get_gen_ai_api_key()
    except ConfigNotFoundError:
        raise OpenAIKeyMissing()


def _build_openai_settings(**kwargs: Any) -> dict[str, Any]:
    """
    Utility to add in some common default values so they don't have to be set every time.
    """
    return {
        "temperature": 0,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0,
        **({"deployment_id": AZURE_DEPLOYMENT_ID} if AZURE_DEPLOYMENT_ID else {}),
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
        except Exception:
            logger.exception("Unexpected error with OpenAI API for query: %s", query)
            raise

    return cast(F, wrapped_call)


def _tiktoken_trim_chunks(
    chunks: list[InferenceChunk], model_version: str, max_chunk_toks: int = 512
) -> list[InferenceChunk]:
    """Edit chunks that have too high token count. Generally due to parsing issues or
    characters from another language that are 1 char = 1 token
    Trimming by tokens leads to information loss but currently no better way of handling
    """
    encoder = tiktoken.encoding_for_model(model_version)
    new_chunks = copy(chunks)
    for ind, chunk in enumerate(new_chunks):
        tokens = encoder.encode(chunk.content)
        if len(tokens) > max_chunk_toks:
            new_chunk = copy(chunk)
            new_chunk.content = encoder.decode(tokens[:max_chunk_toks])
            new_chunks[ind] = new_chunk
    return new_chunks


# used to check if the QAModel is an OpenAI model
class OpenAIQAModel(QAModel, ABC):
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
            self.api_key = api_key or get_gen_ai_api_key()
        except ConfigNotFoundError:
            raise OpenAIKeyMissing()

    @staticmethod
    def _generate_tokens_from_response(response: Any) -> Generator[str, None, None]:
        for event in response:
            yield event["choices"][0]["text"]

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,  # Unused
    ) -> AnswerQuestionReturn:
        context_docs = _tiktoken_trim_chunks(context_docs, self.model_version)

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
                api_key=_ensure_openai_api_key(self.api_key),
                prompt=filled_prompt,
                model=self.model_version,
                max_tokens=self.max_output_tokens,
                request_timeout=self.timeout,
            ),
        )
        model_output = cast(str, response["choices"][0]["text"]).strip()
        logger.info("OpenAI Token Usage: " + str(response["usage"]).replace("\n", ""))
        logger.debug(model_output)

        return process_answer(model_output, context_docs)

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        context_docs = _tiktoken_trim_chunks(context_docs, self.model_version)

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
                api_key=_ensure_openai_api_key(self.api_key),
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
