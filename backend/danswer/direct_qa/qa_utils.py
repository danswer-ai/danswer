import json
import math
import re
from typing import Dict
from typing import Optional
from typing import Tuple
from typing import Union

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
) -> tuple[DanswerAnswer, DanswerQuote]:
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
