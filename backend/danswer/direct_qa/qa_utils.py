import json
import math
import re
from collections.abc import Generator
from typing import Any
from typing import Optional
from typing import Tuple

import regex
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import QUOTE_ALLOWED_ERROR_PERCENT
from danswer.configs.constants import BLURB
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINK
from danswer.configs.constants import SOURCE_TYPE
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.qa_prompts import ANSWER_PAT
from danswer.direct_qa.qa_prompts import QUOTE_PAT
from danswer.direct_qa.qa_prompts import UNCERTAINTY_PAT
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_model_quote
from danswer.utils.text_processing import shared_precompare_cleanup

logger = setup_logger()


def structure_quotes_for_response(
    quotes: list[DanswerQuote] | None,
) -> dict[str, dict[str, str | None]]:
    if quotes is None:
        return {}

    response_quotes = {}
    for quote in quotes:
        response_quotes[quote.quote] = {
            DOCUMENT_ID: quote.document_id,
            SOURCE_LINK: quote.link,
            SOURCE_TYPE: quote.source_type,
            SEMANTIC_IDENTIFIER: quote.semantic_identifier,
            BLURB: quote.blurb,
        }
    return response_quotes


def extract_answer_quotes_freeform(
    answer_raw: str,
) -> Tuple[Optional[str], Optional[list[str]]]:
    """Splits the model output into an Answer and 0 or more Quote sections.
    Splits by the Quote pattern, if not exist then assume it's all answer and no quotes
    """
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
) -> list[DanswerQuote]:
    danswer_quotes = []
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
                    danswer_quotes.append(
                        DanswerQuote(
                            quote=quote,
                            document_id=chunk.document_id,
                            link=curr_link,
                            source_type=chunk.source_type,
                            semantic_identifier=chunk.semantic_identifier,
                            blurb=chunk.blurb,
                        )
                    )
                    break

            # If the offset is larger than the start of the last quote, it must be the last one
            danswer_quotes.append(
                DanswerQuote(
                    quote=quote,
                    document_id=chunk.document_id,
                    link=curr_link,
                    source_type=chunk.source_type,
                    semantic_identifier=chunk.semantic_identifier,
                    blurb=chunk.blurb,
                )
            )
            break

    return danswer_quotes


def process_answer(
    answer_raw: str, chunks: list[InferenceChunk]
) -> tuple[DanswerAnswer, list[DanswerQuote]]:
    answer, quote_strings = separate_answer_quotes(answer_raw)
    if answer == UNCERTAINTY_PAT or not answer:
        if answer == UNCERTAINTY_PAT:
            logger.debug("Answer matched UNCERTAINTY_PAT")
        else:
            logger.debug("No answer extracted from raw output")
        return DanswerAnswer(answer=None), []

    logger.info(f"Answer: {answer}")
    if not quote_strings:
        logger.debug("No quotes extracted from raw output")
        return DanswerAnswer(answer=answer), []
    logger.info(f"All quotes (including unmatched): {quote_strings}")
    quotes = match_quotes_to_docs(quote_strings, chunks)
    logger.info(f"Final quotes: {quotes}")

    return DanswerAnswer(answer=answer), quotes


def stream_json_answer_end(answer_so_far: str, next_token: str) -> bool:
    next_token = next_token.replace('\\"', "")
    # If the previous character is an escape token, don't consider the first character of next_token
    if answer_so_far and answer_so_far[-1] == "\\":
        next_token = next_token[1:]
    if '"' in next_token:
        return True
    return False


def extract_quotes_from_completed_token_stream(
    model_output: str, context_chunks: list[InferenceChunk]
) -> list[DanswerQuote]:
    logger.debug(model_output)
    answer, quotes = process_answer(model_output, context_chunks)
    if answer:
        logger.info(answer)
    elif model_output:
        logger.warning("Answer extraction from model output failed.")

    return quotes


def process_model_tokens(
    tokens: Generator[str, None, None],
    context_docs: list[InferenceChunk],
    is_json_prompt: bool = True,
) -> Generator[dict[str, Any], None, None]:
    """Yields Answer tokens back out in a dict for streaming to frontend
    When Answer section ends, yields dict with answer_finished key
    Collects all the tokens at the end to form the complete model output"""
    model_output: str = ""
    found_answer_start = False if is_json_prompt else True
    found_answer_end = False
    for token in tokens:
        model_previous = model_output
        model_output += token

        trimmed_combine = model_output.replace(" ", "").replace("\n", "")
        if not found_answer_start and '{"answer":"' in trimmed_combine:
            # Note, if the token that completes the pattern has additional text, for example if the token is "?
            # Then the chars after " will not be streamed, but this is ok as it prevents streaming the ? in the
            # event that the model outputs the UNCERTAINTY_PAT
            found_answer_start = True
            continue

        if found_answer_start and not found_answer_end:
            if (is_json_prompt and stream_json_answer_end(model_previous, token)) or (
                not is_json_prompt and f"\n{QUOTE_PAT}" in model_output
            ):
                found_answer_end = True
                yield {"answer_finished": True}
                continue
            yield {"answer_data": token}

    quotes = extract_quotes_from_completed_token_stream(model_output, context_docs)
    yield structure_quotes_for_response(quotes)
