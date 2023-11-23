import math
import re
from collections.abc import Generator
from collections.abc import Iterator
from json.decoder import JSONDecodeError
from typing import Optional
from typing import Tuple

import regex

from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.app_configs import QUOTE_ALLOWED_ERROR_PERCENT
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import check_number_of_tokens
from danswer.prompts.constants import ANSWER_PAT
from danswer.prompts.constants import QUOTE_PAT
from danswer.prompts.constants import UNCERTAINTY_PAT
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_model_quote
from danswer.utils.text_processing import clean_up_code_blocks
from danswer.utils.text_processing import extract_embedded_json
from danswer.utils.text_processing import shared_precompare_cleanup

logger = setup_logger()


def _extract_answer_quotes_freeform(
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


def _extract_answer_quotes_json(
    answer_dict: dict[str, str | list[str]]
) -> Tuple[Optional[str], Optional[list[str]]]:
    answer_dict = {k.lower(): v for k, v in answer_dict.items()}
    answer = str(answer_dict.get("answer"))
    quotes = answer_dict.get("quotes") or answer_dict.get("quote")
    if isinstance(quotes, str):
        quotes = [quotes]
    return answer, quotes


def _extract_answer_json(raw_model_output: str) -> dict:
    try:
        answer_json = extract_embedded_json(raw_model_output)
    except (ValueError, JSONDecodeError):
        # LLMs get confused when handling the list in the json. Sometimes it doesn't attend
        # enough to the previous { token so it just ends the list of quotes and stops there
        # here, we add logic to try to fix this LLM error.
        answer_json = extract_embedded_json(raw_model_output + "}")

    if "answer" not in answer_json:
        raise ValueError("Model did not output an answer as expected.")

    return answer_json


def separate_answer_quotes(
    answer_raw: str, is_json_prompt: bool = False
) -> Tuple[Optional[str], Optional[list[str]]]:
    """Takes in a raw model output and pulls out the answer and the quotes sections."""
    if is_json_prompt:
        model_raw_json = _extract_answer_json(answer_raw)
        return _extract_answer_quotes_json(model_raw_json)

    return _extract_answer_quotes_freeform(clean_up_code_blocks(answer_raw))


def match_quotes_to_docs(
    quotes: list[str],
    chunks: list[InferenceChunk],
    max_error_percent: float = QUOTE_ALLOWED_ERROR_PERCENT,
    fuzzy_search: bool = False,
    prefix_only_length: int = 100,
) -> DanswerQuotes:
    danswer_quotes: list[DanswerQuote] = []
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
                # Should always find one because offset is at least 0 and there
                # must be a 0 link_offset
                if int(link_offset) <= offset:
                    curr_link = link
                else:
                    break

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

    return DanswerQuotes(quotes=danswer_quotes)


def process_answer(
    answer_raw: str,
    chunks: list[InferenceChunk],
    is_json_prompt: bool = True,
) -> tuple[DanswerAnswer, DanswerQuotes]:
    """Used (1) in the non-streaming case to process the model output
    into an Answer and Quotes AND (2) after the complete streaming response
    has been received to process the model output into an Answer and Quotes."""
    answer, quote_strings = separate_answer_quotes(answer_raw, is_json_prompt)
    if answer == UNCERTAINTY_PAT or not answer:
        if answer == UNCERTAINTY_PAT:
            logger.debug("Answer matched UNCERTAINTY_PAT")
        else:
            logger.debug("No answer extracted from raw output")
        return DanswerAnswer(answer=None), DanswerQuotes(quotes=[])

    logger.info(f"Answer: {answer}")
    if not quote_strings:
        logger.debug("No quotes extracted from raw output")
        return DanswerAnswer(answer=answer), DanswerQuotes(quotes=[])
    logger.info(f"All quotes (including unmatched): {quote_strings}")
    quotes = match_quotes_to_docs(quote_strings, chunks)
    logger.info(f"Final quotes: {quotes}")

    return DanswerAnswer(answer=answer), quotes


def _stream_json_answer_end(answer_so_far: str, next_token: str) -> bool:
    next_token = next_token.replace('\\"', "")
    # If the previous character is an escape token, don't consider the first character of next_token
    # This does not work if it's an escaped escape sign before the " but this is rare, not worth handling
    if answer_so_far and answer_so_far[-1] == "\\":
        next_token = next_token[1:]
    if '"' in next_token:
        return True
    return False


def _extract_quotes_from_completed_token_stream(
    model_output: str, context_chunks: list[InferenceChunk]
) -> DanswerQuotes:
    answer, quotes = process_answer(model_output, context_chunks)
    if answer:
        logger.info(answer)
    elif model_output:
        logger.warning("Answer extraction from model output failed.")

    return quotes


def process_model_tokens(
    tokens: Iterator[str],
    context_docs: list[InferenceChunk],
    is_json_prompt: bool = True,
) -> Generator[DanswerAnswerPiece | DanswerQuotes, None, None]:
    """Used in the streaming case to process the model output
    into an Answer and Quotes

    Yields Answer tokens back out in a dict for streaming to frontend
    When Answer section ends, yields dict with answer_finished key
    Collects all the tokens at the end to form the complete model output"""
    quote_pat = f"\n{QUOTE_PAT}"
    # Sometimes worse model outputs new line instead of :
    quote_loose = f"\n{quote_pat[:-1]}\n"
    # Sometime model outputs two newlines before quote section
    quote_pat_full = f"\n{quote_pat}"
    model_output: str = ""
    found_answer_start = False if is_json_prompt else True
    found_answer_end = False
    hold_quote = ""
    for token in tokens:
        model_previous = model_output
        model_output += token

        if not found_answer_start and '{"answer":"' in re.sub(r"\s", "", model_output):
            # Note, if the token that completes the pattern has additional text, for example if the token is "?
            # Then the chars after " will not be streamed, but this is ok as it prevents streaming the ? in the
            # event that the model outputs the UNCERTAINTY_PAT
            found_answer_start = True

            # Prevent heavy cases of hallucinations where model is not even providing a json until later
            if is_json_prompt and len(model_output) > 40:
                logger.warning("LLM did not produce json as prompted")
                found_answer_end = True

            continue

        if found_answer_start and not found_answer_end:
            if is_json_prompt and _stream_json_answer_end(model_previous, token):
                found_answer_end = True
                yield DanswerAnswerPiece(answer_piece=None)
                continue
            elif not is_json_prompt:
                if quote_pat in hold_quote + token or quote_loose in hold_quote + token:
                    found_answer_end = True
                    yield DanswerAnswerPiece(answer_piece=None)
                    continue
                if hold_quote + token in quote_pat_full:
                    hold_quote += token
                    continue
            yield DanswerAnswerPiece(answer_piece=hold_quote + token)
            hold_quote = ""

    logger.debug(f"Raw Model QnA Output: {model_output}")

    yield _extract_quotes_from_completed_token_stream(model_output, context_docs)


def simulate_streaming_response(model_out: str) -> Generator[str, None, None]:
    """Mock streaming by generating the passed in model output, character by character"""
    for token in model_out:
        yield token


def _get_usable_chunks(
    chunks: list[InferenceChunk], token_limit: int
) -> list[InferenceChunk]:
    total_token_count = 0
    usable_chunks = []
    for chunk in chunks:
        chunk_token_count = check_number_of_tokens(chunk.content)
        if total_token_count + chunk_token_count > token_limit:
            break

        total_token_count += chunk_token_count
        usable_chunks.append(chunk)

    # try and return at least one chunk if possible. This chunk will
    # get truncated later on in the pipeline. This would only occur if
    # the first chunk is larger than the token limit (usually due to character
    # count -> token count mismatches caused by special characters / non-ascii
    # languages)
    if not usable_chunks and chunks:
        usable_chunks = [chunks[0]]

    return usable_chunks


def get_usable_chunks(
    chunks: list[InferenceChunk],
    token_limit: int = NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL,
    offset: int = 0,
) -> list[InferenceChunk]:
    offset_into_chunks = 0
    usable_chunks: list[InferenceChunk] = []
    for _ in range(min(offset + 1, 1)):  # go through this process at least once
        if offset_into_chunks >= len(chunks) and offset_into_chunks > 0:
            raise ValueError(
                "Chunks offset too large, should not retry this many times"
            )

        usable_chunks = _get_usable_chunks(
            chunks=chunks[offset_into_chunks:], token_limit=token_limit
        )
        offset_into_chunks += len(usable_chunks)

    return usable_chunks


def get_chunks_for_qa(
    chunks: list[InferenceChunk],
    llm_chunk_selection: list[bool],
    token_limit: int | None = NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL,
    batch_offset: int = 0,
) -> list[int]:
    """
    Gives back indices of chunks to pass into the LLM for Q&A.

    Only selects chunks viable for Q&A, within the token limit, and prioritize those selected
    by the LLM in a separate flow (this can be turned off)

    Note, the batch_offset calculation has to count the batches from the beginning each time as
    there's no way to know which chunks were included in the prior batches without recounting atm,
    this is somewhat slow as it requires tokenizing all the chunks again
    """
    batch_index = 0
    latest_batch_indices: list[int] = []
    token_count = 0

    # First iterate the LLM selected chunks, then iterate the rest if tokens remaining
    for selection_target in [True, False]:
        for ind, chunk in enumerate(chunks):
            if llm_chunk_selection[ind] is not selection_target or chunk.metadata.get(
                IGNORE_FOR_QA
            ):
                continue

            # We calculate it live in case the user uses a different LLM + tokenizer
            chunk_token = check_number_of_tokens(chunk.content)
            # 50 for an approximate/slight overestimate for # tokens for metadata for the chunk
            token_count += chunk_token + 50

            # Always use at least 1 chunk
            if (
                token_limit is None
                or token_count <= token_limit
                or not latest_batch_indices
            ):
                latest_batch_indices.append(ind)
                current_chunk_unused = False
            else:
                current_chunk_unused = True

            if token_limit is not None and token_count >= token_limit:
                if batch_index < batch_offset:
                    batch_index += 1
                    if current_chunk_unused:
                        latest_batch_indices = [ind]
                        token_count = chunk_token
                    else:
                        latest_batch_indices = []
                        token_count = 0
                else:
                    return latest_batch_indices

    return latest_batch_indices
