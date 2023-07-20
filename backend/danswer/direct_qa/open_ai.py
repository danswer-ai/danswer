import json
from collections.abc import Callable
from collections.abc import Generator
from functools import wraps
from typing import Any
from typing import cast
from typing import Literal
from typing import TypeVar

import openai
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import INCLUDE_METADATA
from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.configs.model_configs import OPENAI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import OPENAI_MODEL_VERSION
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import get_chat_reflexion_msg
from danswer.direct_qa.qa_prompts import json_chat_processor
from danswer.direct_qa.qa_prompts import json_processor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import stream_answer_end
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from openai.error import AuthenticationError
from openai.error import Timeout


logger = setup_logger()


def get_openai_api_key() -> str:
    return OPENAI_API_KEY or cast(
        str, get_dynamic_config_store().load(OPENAI_API_KEY_STORAGE_KEY)
    )


def check_openai_api_key_is_valid(openai_api_key: str) -> bool:
    if not openai_api_key:
        return False

    qa_model = OpenAICompletionQA(api_key=openai_api_key, timeout=5)
    if not isinstance(qa_model, OpenAIQAModel):
        raise ValueError("Cannot check OpenAI API key validity for non-OpenAI QA model")

    # try for up to 2 timeouts (e.g. 10 seconds in total)
    for _ in range(2):
        try:
            qa_model.answer_question("Do not respond", [])
            return True
        except AuthenticationError:
            return False
        except Timeout:
            pass

    return False


F = TypeVar("F", bound=Callable)
ModelType = Literal["ChatCompletion", "Completion"]
PromptProcessor = Callable[[str, list[str]], str]


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
        prompt_processor: Callable[
            [str, list[InferenceChunk], bool], str
        ] = json_processor,
        model_version: str = OPENAI_MODEL_VERSION,
        max_output_tokens: int = OPENAI_MAX_OUTPUT_TOKENS,
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

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, DanswerQuote]:
        filled_prompt = self.prompt_processor(
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
        filled_prompt = self.prompt_processor(
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
        model_output: str = ""
        found_answer_start = False
        found_answer_end = False
        # iterate through the stream of events
        for event in response:
            event_text = cast(str, event["choices"][0]["text"])
            model_previous = model_output
            model_output += event_text

            if not found_answer_start and '{"answer":"' in model_output.replace(
                " ", ""
            ).replace("\n", ""):
                found_answer_start = True
                continue

            if found_answer_start and not found_answer_end:
                if stream_answer_end(model_previous, event_text):
                    found_answer_end = True
                    yield {"answer_finished": True}
                    continue
                yield {"answer_data": event_text}

        logger.debug(model_output)

        answer, quotes_dict = process_answer(model_output, context_docs)
        if answer:
            logger.info(answer)
        else:
            logger.warning(
                "Answer extraction from model output failed, most likely no quotes provided"
            )

        if quotes_dict is None:
            yield {}
        else:
            yield quotes_dict


class OpenAIChatCompletionQA(OpenAIQAModel):
    def __init__(
        self,
        prompt_processor: Callable[
            [str, list[InferenceChunk], bool], list[dict[str, str]]
        ] = json_chat_processor,
        model_version: str = OPENAI_MODEL_VERSION,
        max_output_tokens: int = OPENAI_MAX_OUTPUT_TOKENS,
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

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> tuple[DanswerAnswer, DanswerQuote]:
        messages = self.prompt_processor(query, context_docs, self.include_metadata)
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
            messages.extend([assistant_msg, get_chat_reflexion_msg()])
            logger.info(
                "OpenAI Token Usage: " + str(response["usage"]).replace("\n", "")
            )

        logger.debug(model_output)

        answer, quotes_dict = process_answer(model_output, context_docs)
        return answer, quotes_dict

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        messages = self.prompt_processor(query, context_docs, self.include_metadata)
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
        model_output: str = ""
        found_answer_start = False
        found_answer_end = False
        for event in response:
            event_dict = cast(dict[str, Any], event["choices"][0]["delta"])
            if (
                "content" not in event_dict
            ):  # could be a role message or empty termination
                continue
            event_text = event_dict["content"]
            model_previous = model_output
            model_output += event_text
            logger.debug(f"GPT returned token: {event_text}")

            if not found_answer_start and '{"answer":"' in model_output.replace(
                " ", ""
            ).replace("\n", ""):
                # Note, if the token that completes the pattern has additional text, for example if the token is "?
                # Then the chars after " will not be streamed, but this is ok as it prevents streaming the ? in the
                # event that the model outputs the UNCERTAINTY_PAT
                found_answer_start = True
                continue

            if found_answer_start and not found_answer_end:
                if stream_answer_end(model_previous, event_text):
                    found_answer_end = True
                    yield {"answer_finished": True}
                    continue
                yield {"answer_data": event_text}

        logger.debug(model_output)

        _, quotes_dict = process_answer(model_output, context_docs)

        yield {} if quotes_dict is None else quotes_dict
