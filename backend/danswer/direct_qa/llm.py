import json
import math
import re
from collections.abc import Callable
from collections.abc import Generator
from functools import wraps
from typing import Any
from typing import cast
from typing import Dict
from typing import Literal
from typing import Optional
from typing import Tuple
from typing import TypeVar
from typing import Union

import openai
import regex
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import INCLUDE_METADATA
from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.app_configs import QUOTE_ALLOWED_ERROR_PERCENT
from danswer.configs.constants import BLURB
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINK
from danswer.configs.constants import SOURCE_TYPE
from danswer.configs.model_configs import OPENAI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import OPENAI_MODEL_VERSION
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import ANSWER_PAT
from danswer.direct_qa.qa_prompts import get_chat_reflexion_msg
from danswer.direct_qa.qa_prompts import json_chat_processor
from danswer.direct_qa.qa_prompts import json_processor
from danswer.direct_qa.qa_prompts import QUOTE_PAT
from danswer.direct_qa.qa_prompts import UNCERTAINTY_PAT
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_model_quote
from danswer.utils.text_processing import shared_precompare_cleanup
from danswer.utils.timing import log_function_time
from openai.error import AuthenticationError
from openai.error import Timeout


logger = setup_logger()


def get_openai_api_key() -> str:
    return OPENAI_API_KEY or cast(
        str, get_dynamic_config_store().load(OPENAI_API_KEY_STORAGE_KEY)
    )


def get_json_line(json_dict: dict) -> str:
    return json.dumps(json_dict) + "\n"


def extract_answer_quotes_freeform(
    answer_raw: str,
) -> Tuple[Optional[str], Optional[list[str]]]:
    null_answer_check = (
        answer_raw.replace(ANSWER_PAT, "").replace(QUOTE_PAT, "").strip()
    )

    # If model just gives back the uncertainty pattern to signify answer isn't found or nothing at all
    # if null_answer_check == UNCERTAINTY_PAT or not null_answer_check:
    #     return None, None

    # If no answer section, don't care about the quote
    if answer_raw.lower().strip().startswith(QUOTE_PAT.lower()):
        return None, None

    # Sometimes model regenerates the Answer: pattern despite it being provided in the prompt
    if answer_raw.lower().startswith(ANSWER_PAT.lower()):
        answer_raw = answer_raw[len(ANSWER_PAT) :]

    # Accept quote sections starting with the lower case version
    answer_raw = answer_raw.replace(
        f"\n{QUOTE_PAT}".lower(), f"\n{QUOTE_PAT}"
    )  # Just in case model unreliable

    sections = re.split(rf"(?<=\n){QUOTE_PAT}", answer_raw)
    sections_clean = [
        str(section).strip() for section in sections if str(section).strip()
    ]
    if not sections_clean:
        return None, None

    answer = str(sections_clean[0])
    if len(sections) == 1:
        return answer, None
    return answer, sections_clean[1:]


def extract_answer_quotes_json(
    answer_dict: dict[str, str | list[str]]
) -> Tuple[Optional[str], Optional[list[str]]]:
    answer_dict = {k.lower(): v for k, v in answer_dict.items()}
    answer = str(answer_dict.get("answer"))
    quotes = answer_dict.get("quotes") or answer_dict.get("quote")
    if isinstance(quotes, str):
        quotes = [quotes]
    return answer, quotes


def separate_answer_quotes(
    answer_raw: str,
) -> Tuple[Optional[str], Optional[list[str]]]:
    try:
        model_raw_json = json.loads(answer_raw)
        return extract_answer_quotes_json(model_raw_json)
    except ValueError:
        return extract_answer_quotes_freeform(answer_raw)


def match_quotes_to_docs(
    quotes: list[str],
    chunks: list[InferenceChunk],
    max_error_percent: float = QUOTE_ALLOWED_ERROR_PERCENT,
    fuzzy_search: bool = False,
    prefix_only_length: int = 100,
) -> Dict[str, Dict[str, Union[str, int, None]]]:
    quotes_dict: dict[str, dict[str, Union[str, int, None]]] = {}
    for quote in quotes:
        max_edits = math.ceil(float(len(quote)) * max_error_percent)

        for chunk in chunks:
            if not chunk.source_links:
                continue

            quote_clean = shared_precompare_cleanup(
                clean_model_quote(quote, trim_length=prefix_only_length)
            )
            chunk_clean = shared_precompare_cleanup(chunk.content)

            # Finding the offset of the quote in the plain text
            if fuzzy_search:
                re_search_str = (
                    r"(" + re.escape(quote_clean) + r"){e<=" + str(max_edits) + r"}"
                )
                found = regex.search(re_search_str, chunk_clean)
                if not found:
                    continue
                offset = found.span()[0]
            else:
                if quote_clean not in chunk_clean:
                    continue
                offset = chunk_clean.index(quote_clean)

            # Extracting the link from the offset
            curr_link = None
            for link_offset, link in chunk.source_links.items():
                # Should always find one because offset is at least 0 and there must be a 0 link_offset
                if int(link_offset) <= offset:
                    curr_link = link
                else:
                    quotes_dict[quote] = {
                        DOCUMENT_ID: chunk.document_id,
                        SOURCE_LINK: curr_link,
                        SOURCE_TYPE: chunk.source_type,
                        SEMANTIC_IDENTIFIER: chunk.semantic_identifier,
                        BLURB: chunk.blurb,
                    }
                    break
            quotes_dict[quote] = {
                DOCUMENT_ID: chunk.document_id,
                SOURCE_LINK: curr_link,
                SOURCE_TYPE: chunk.source_type,
                SEMANTIC_IDENTIFIER: chunk.semantic_identifier,
                BLURB: chunk.blurb,
            }
            break
    return quotes_dict


def process_answer(
    answer_raw: str, chunks: list[InferenceChunk]
) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
    answer, quote_strings = separate_answer_quotes(answer_raw)
    if answer == UNCERTAINTY_PAT or not answer:
        if answer == UNCERTAINTY_PAT:
            logger.debug("Answer matched UNCERTAINTY_PAT")
        else:
            logger.debug("No answer extracted from raw output")
        return None, None

    logger.info(f"Answer: {answer}")
    if not quote_strings:
        logger.debug("No quotes extracted from raw output")
        return answer, None
    logger.info(f"All quotes (including unmatched): {quote_strings}")
    quotes_dict = match_quotes_to_docs(quote_strings, chunks)
    logger.info(f"Final quotes dict: {quotes_dict}")

    return answer, quotes_dict


def stream_answer_end(answer_so_far: str, next_token: str) -> bool:
    next_token = next_token.replace('\\"', "")
    # If the previous character is an escape token, don't consider the first character of next_token
    if answer_so_far and answer_so_far[-1] == "\\":
        next_token = next_token[1:]
    if '"' in next_token:
        return True
    return False


F = TypeVar("F", bound=Callable)

Answer = str
Quotes = dict[str, dict[str, str | int | None]]
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
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
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
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
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
