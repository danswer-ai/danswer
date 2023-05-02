import math
import re
from collections.abc import Callable
from typing import Dict
from typing import Optional
from typing import Tuple
from typing import Union

import openai
import regex
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.app_configs import QUOTE_ALLOWED_ERROR_PERCENT
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import SOURCE_LINK
from danswer.configs.constants import SOURCE_TYPE
from danswer.configs.model_configs import OPENAI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import OPENAPI_MODEL_VERSION
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import ANSWER_PAT
from danswer.direct_qa.qa_prompts import generic_prompt_processor
from danswer.direct_qa.qa_prompts import QUOTE_PAT
from danswer.direct_qa.qa_prompts import UNCERTAINTY_PAT
from danswer.utils.logging import setup_logger
from danswer.utils.text_processing import clean_model_quote
from danswer.utils.text_processing import shared_precompare_cleanup
from danswer.utils.timing import log_function_time


logger = setup_logger()

openai.api_key = OPENAI_API_KEY


def separate_answer_quotes(
    answer_raw: str,
) -> Tuple[Optional[str], Optional[list[str]]]:
    """Gives back the answer and quote sections"""
    null_answer_check = (
        answer_raw.replace(ANSWER_PAT, "").replace(QUOTE_PAT, "").strip()
    )

    # If model just gives back the uncertainty pattern to signify answer isn't found or nothing at all
    if null_answer_check == UNCERTAINTY_PAT or not null_answer_check:
        return None, None

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
                    }
                    break
            quotes_dict[quote] = {
                DOCUMENT_ID: chunk.document_id,
                SOURCE_LINK: curr_link,
                SOURCE_TYPE: chunk.source_type,
            }
            break
    return quotes_dict


def process_answer(
    answer_raw: str, chunks: list[InferenceChunk]
) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
    answer, quote_strings = separate_answer_quotes(answer_raw)
    if not answer or not quote_strings:
        return None, None
    quotes_dict = match_quotes_to_docs(quote_strings, chunks)
    return answer, quotes_dict


class OpenAICompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: Callable[[str, list[str]], str] = generic_prompt_processor,
        model_version: str = OPENAPI_MODEL_VERSION,
        max_output_tokens: int = OPENAI_MAX_OUTPUT_TOKENS,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.model_version = model_version
        self.max_output_tokens = max_output_tokens

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
        top_contents = [ranked_chunk.content for ranked_chunk in context_docs]
        filled_prompt = self.prompt_processor(query, top_contents)
        logger.debug(filled_prompt)

        try:
            response = openai.Completion.create(
                prompt=filled_prompt,
                temperature=0,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                model=self.model_version,
                max_tokens=self.max_output_tokens,
            )
            model_output = response["choices"][0]["text"].strip()
            logger.info(
                "OpenAI Token Usage: " + str(response["usage"]).replace("\n", "")
            )
        except Exception as e:
            logger.exception(e)
            model_output = "Model Failure"

        logger.debug(model_output)

        answer, quotes_dict = process_answer(model_output, context_docs)
        return answer, quotes_dict
