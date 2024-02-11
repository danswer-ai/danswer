import re
from collections.abc import Callable
from collections.abc import Iterator
from datetime import datetime
from functools import lru_cache
from typing import cast

from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage
from sqlalchemy.orm import Session

from danswer.chat.models import CitationInfo
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import LlmDoc
from danswer.configs.chat_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.chat_configs import STOP_STREAM_PAT
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_SINGLE_USER_MESSAGE_EXPECTED_MAX_TOKENS
from danswer.db.chat import get_chat_messages_by_session
from danswer.db.models import ChatMessage
from danswer.db.models import Persona
from danswer.db.models import Prompt
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import check_number_of_tokens
from danswer.llm.utils import get_max_input_tokens
from danswer.prompts.chat_prompts import CHAT_USER_CONTEXT_FREE_PROMPT
from danswer.prompts.chat_prompts import CHAT_USER_PROMPT
from danswer.prompts.chat_prompts import CITATION_REMINDER
from danswer.prompts.chat_prompts import DEFAULT_IGNORE_STATEMENT
from danswer.prompts.chat_prompts import NO_CITATION_STATEMENT
from danswer.prompts.chat_prompts import REQUIRE_CITATION_STATEMENT
from danswer.prompts.constants import CODE_BLOCK_PAT
from danswer.prompts.constants import TRIPLE_BACKTICK
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.prompt_utils import get_current_llm_day_time
from danswer.prompts.token_counts import (
    CHAT_USER_PROMPT_WITH_CONTEXT_OVERHEAD_TOKEN_CNT,
)
from danswer.prompts.token_counts import CITATION_REMINDER_TOKEN_CNT
from danswer.prompts.token_counts import CITATION_STATEMENT_TOKEN_CNT
from danswer.prompts.token_counts import LANGUAGE_HINT_TOKEN_CNT

# Maps connector enum string to a more natural language representation for the LLM
# If not on the list, uses the original but slightly cleaned up, see below
CONNECTOR_NAME_MAP = {
    "web": "Website",
    "requesttracker": "Request Tracker",
    "github": "GitHub",
    "file": "File Upload",
}


def clean_up_source(source_str: str) -> str:
    if source_str in CONNECTOR_NAME_MAP:
        return CONNECTOR_NAME_MAP[source_str]
    return source_str.replace("_", " ").title()


def build_doc_context_str(
    semantic_identifier: str,
    source_type: DocumentSource,
    content: str,
    metadata_dict: dict[str, str | list[str]],
    updated_at: datetime | None,
    ind: int,
    include_metadata: bool = True,
) -> str:
    context_str = ""
    if include_metadata:
        context_str += f"DOCUMENT {ind}: {semantic_identifier}\n"
        context_str += f"Source: {clean_up_source(source_type)}\n"

        for k, v in metadata_dict.items():
            if isinstance(v, list):
                v_str = ", ".join(v)
                context_str += f"{k.capitalize()}: {v_str}\n"
            else:
                context_str += f"{k.capitalize()}: {v}\n"

        if updated_at:
            update_str = updated_at.strftime("%B %d, %Y %H:%M")
            context_str += f"Updated: {update_str}\n"
    context_str += f"{CODE_BLOCK_PAT.format(content.strip())}\n\n\n"
    return context_str


def build_complete_context_str(
    context_docs: list[LlmDoc | InferenceChunk],
    include_metadata: bool = True,
) -> str:
    context_str = ""
    for ind, doc in enumerate(context_docs, start=1):
        context_str += build_doc_context_str(
            semantic_identifier=doc.semantic_identifier,
            source_type=doc.source_type,
            content=doc.content,
            metadata_dict=doc.metadata,
            updated_at=doc.updated_at,
            ind=ind,
            include_metadata=include_metadata,
        )

    return context_str.strip()


@lru_cache()
def build_chat_system_message(
    prompt: Prompt,
    context_exists: bool,
    llm_tokenizer_encode_func: Callable,
    citation_line: str = REQUIRE_CITATION_STATEMENT,
    no_citation_line: str = NO_CITATION_STATEMENT,
) -> tuple[SystemMessage | None, int]:
    system_prompt = prompt.system_prompt.strip()
    if prompt.include_citations:
        if context_exists:
            system_prompt += citation_line
        else:
            system_prompt += no_citation_line
    if prompt.datetime_aware:
        if system_prompt:
            system_prompt += (
                f"\n\nAdditional Information:\n\t- {get_current_llm_day_time()}."
            )
        else:
            system_prompt = get_current_llm_day_time()

    if not system_prompt:
        return None, 0

    token_count = len(llm_tokenizer_encode_func(system_prompt))
    system_msg = SystemMessage(content=system_prompt)

    return system_msg, token_count


def build_task_prompt_reminders(
    prompt: Prompt,
    use_language_hint: bool = bool(MULTILINGUAL_QUERY_EXPANSION),
    citation_str: str = CITATION_REMINDER,
    language_hint_str: str = LANGUAGE_HINT,
) -> str:
    base_task = prompt.task_prompt
    citation_or_nothing = citation_str if prompt.include_citations else ""
    language_hint_or_nothing = language_hint_str.lstrip() if use_language_hint else ""
    return base_task + citation_or_nothing + language_hint_or_nothing


def llm_doc_from_inference_chunk(inf_chunk: InferenceChunk) -> LlmDoc:
    return LlmDoc(
        document_id=inf_chunk.document_id,
        content=inf_chunk.content,
        semantic_identifier=inf_chunk.semantic_identifier,
        source_type=inf_chunk.source_type,
        metadata=inf_chunk.metadata,
        updated_at=inf_chunk.updated_at,
        link=inf_chunk.source_links[0] if inf_chunk.source_links else None,
    )


def map_document_id_order(
    chunks: list[InferenceChunk | LlmDoc], one_indexed: bool = True
) -> dict[str, int]:
    order_mapping = {}
    current = 1 if one_indexed else 0
    for chunk in chunks:
        if chunk.document_id not in order_mapping:
            order_mapping[chunk.document_id] = current
            current += 1

    return order_mapping


def build_chat_user_message(
    chat_message: ChatMessage,
    prompt: Prompt,
    context_docs: list[LlmDoc],
    llm_tokenizer_encode_func: Callable,
    all_doc_useful: bool,
    user_prompt_template: str = CHAT_USER_PROMPT,
    context_free_template: str = CHAT_USER_CONTEXT_FREE_PROMPT,
    ignore_str: str = DEFAULT_IGNORE_STATEMENT,
) -> tuple[HumanMessage, int]:
    user_query = chat_message.message

    if not context_docs:
        # Simpler prompt for cases where there is no context
        user_prompt = (
            context_free_template.format(
                task_prompt=prompt.task_prompt, user_query=user_query
            )
            if prompt.task_prompt
            else user_query
        )
        user_prompt = user_prompt.strip()
        token_count = len(llm_tokenizer_encode_func(user_prompt))
        user_msg = HumanMessage(content=user_prompt)
        return user_msg, token_count

    context_docs_str = build_complete_context_str(
        cast(list[LlmDoc | InferenceChunk], context_docs)
    )
    optional_ignore = "" if all_doc_useful else ignore_str

    task_prompt_with_reminder = build_task_prompt_reminders(prompt)

    user_prompt = user_prompt_template.format(
        optional_ignore_statement=optional_ignore,
        context_docs_str=context_docs_str,
        task_prompt=task_prompt_with_reminder,
        user_query=user_query,
    )

    user_prompt = user_prompt.strip()
    token_count = len(llm_tokenizer_encode_func(user_prompt))
    user_msg = HumanMessage(content=user_prompt)

    return user_msg, token_count


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
    token_limit: int,
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
    token_limit: int | None,
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


def create_chat_chain(
    chat_session_id: int,
    db_session: Session,
) -> tuple[ChatMessage, list[ChatMessage]]:
    """Build the linear chain of messages without including the root message"""
    mainline_messages: list[ChatMessage] = []
    all_chat_messages = get_chat_messages_by_session(
        chat_session_id=chat_session_id,
        user_id=None,
        db_session=db_session,
        skip_permission_check=True,
    )
    id_to_msg = {msg.id: msg for msg in all_chat_messages}

    if not all_chat_messages:
        raise ValueError("No messages in Chat Session")

    root_message = all_chat_messages[0]
    if root_message.parent_message is not None:
        raise RuntimeError(
            "Invalid root message, unable to fetch valid chat message sequence"
        )

    current_message: ChatMessage | None = root_message
    while current_message is not None:
        child_msg = current_message.latest_child_message
        if not child_msg:
            break
        current_message = id_to_msg.get(child_msg)

        if current_message is None:
            raise RuntimeError(
                "Invalid message chain,"
                "could not find next message in the same session"
            )

        mainline_messages.append(current_message)

    if not mainline_messages:
        raise RuntimeError("Could not trace chat message history")

    return mainline_messages[-1], mainline_messages[:-1]


def combine_message_chain(
    messages: list[ChatMessage],
    token_limit: int,
    msg_limit: int | None = None,
) -> str:
    """Used for secondary LLM flows that require the chat history,"""
    message_strs: list[str] = []
    total_token_count = 0

    if msg_limit is not None:
        messages = messages[-msg_limit:]

    for message in reversed(messages):
        message_token_count = message.token_count

        if total_token_count + message_token_count > token_limit:
            break

        role = message.message_type.value.upper()
        message_strs.insert(0, f"{role}:\n{message.message}")
        total_token_count += message_token_count

    return "\n\n".join(message_strs)


_PER_MESSAGE_TOKEN_BUFFER = 7


def find_last_index(lst: list[int], max_prompt_tokens: int) -> int:
    """From the back, find the index of the last element to include
    before the list exceeds the maximum"""
    running_sum = 0

    last_ind = 0
    for i in range(len(lst) - 1, -1, -1):
        running_sum += lst[i] + _PER_MESSAGE_TOKEN_BUFFER
        if running_sum > max_prompt_tokens:
            last_ind = i + 1
            break
    if last_ind >= len(lst):
        raise ValueError("Last message alone is too large!")
    return last_ind


def drop_messages_history_overflow(
    system_msg: BaseMessage | None,
    system_token_count: int,
    history_msgs: list[BaseMessage],
    history_token_counts: list[int],
    final_msg: BaseMessage,
    final_msg_token_count: int,
    max_allowed_tokens: int,
) -> list[BaseMessage]:
    """As message history grows, messages need to be dropped starting from the furthest in the past.
    The System message should be kept if at all possible and the latest user input which is inserted in the
    prompt template must be included"""
    if len(history_msgs) != len(history_token_counts):
        # This should never happen
        raise ValueError("Need exactly 1 token count per message for tracking overflow")

    prompt: list[BaseMessage] = []

    # Start dropping from the history if necessary
    all_tokens = history_token_counts + [system_token_count, final_msg_token_count]
    ind_prev_msg_start = find_last_index(
        all_tokens, max_prompt_tokens=max_allowed_tokens
    )

    if system_msg and ind_prev_msg_start <= len(history_msgs):
        prompt.append(system_msg)

    prompt.extend(history_msgs[ind_prev_msg_start:])

    prompt.append(final_msg)

    return prompt


def in_code_block(llm_text: str) -> bool:
    count = llm_text.count(TRIPLE_BACKTICK)
    return count % 2 != 0


def extract_citations_from_stream(
    tokens: Iterator[str],
    context_docs: list[LlmDoc],
    doc_id_to_rank_map: dict[str, int],
    stop_stream: str | None = STOP_STREAM_PAT,
) -> Iterator[DanswerAnswerPiece | CitationInfo]:
    llm_out = ""
    max_citation_num = len(context_docs)
    curr_segment = ""
    prepend_bracket = False
    cited_inds = set()
    hold = ""
    for raw_token in tokens:
        if stop_stream:
            next_hold = hold + raw_token

            if stop_stream in next_hold:
                break

            if next_hold == stop_stream[: len(next_hold)]:
                hold = next_hold
                continue

            token = next_hold
            hold = ""
        else:
            token = raw_token

        # Special case of [1][ where ][ is a single token
        # This is where the model attempts to do consecutive citations like [1][2]
        if prepend_bracket:
            curr_segment += "[" + curr_segment
            prepend_bracket = False

        curr_segment += token
        llm_out += token

        possible_citation_pattern = r"(\[\d*$)"  # [1, [, etc
        possible_citation_found = re.search(possible_citation_pattern, curr_segment)

        citation_pattern = r"\[(\d+)\]"  # [1], [2] etc
        citation_found = re.search(citation_pattern, curr_segment)

        if citation_found and not in_code_block(llm_out):
            numerical_value = int(citation_found.group(1))
            if 1 <= numerical_value <= max_citation_num:
                context_llm_doc = context_docs[
                    numerical_value - 1
                ]  # remove 1 index offset

                link = context_llm_doc.link
                target_citation_num = doc_id_to_rank_map[context_llm_doc.document_id]

                # Use the citation number for the document's rank in
                # the search (or selected docs) results
                curr_segment = re.sub(
                    rf"\[{numerical_value}\]", f"[{target_citation_num}]", curr_segment
                )

                if target_citation_num not in cited_inds:
                    cited_inds.add(target_citation_num)
                    yield CitationInfo(
                        citation_num=target_citation_num,
                        document_id=context_llm_doc.document_id,
                    )

                if link:
                    curr_segment = re.sub(r"\[", "[[", curr_segment, count=1)
                    curr_segment = re.sub("]", f"]]({link})", curr_segment, count=1)

                # In case there's another open bracket like [1][, don't want to match this
            possible_citation_found = None

        # if we see "[", but haven't seen the right side, hold back - this may be a
        # citation that needs to be replaced with a link
        if possible_citation_found:
            continue

        # Special case with back to back citations [1][2]
        if curr_segment and curr_segment[-1] == "[":
            curr_segment = curr_segment[:-1]
            prepend_bracket = True

        yield DanswerAnswerPiece(answer_piece=curr_segment)
        curr_segment = ""

    if curr_segment:
        if prepend_bracket:
            yield DanswerAnswerPiece(answer_piece="[" + curr_segment)
        else:
            yield DanswerAnswerPiece(answer_piece=curr_segment)


def get_prompt_tokens(prompt: Prompt) -> int:
    return (
        check_number_of_tokens(prompt.system_prompt)
        + check_number_of_tokens(prompt.task_prompt)
        + CHAT_USER_PROMPT_WITH_CONTEXT_OVERHEAD_TOKEN_CNT
        + CITATION_STATEMENT_TOKEN_CNT
        + CITATION_REMINDER_TOKEN_CNT
        + (LANGUAGE_HINT_TOKEN_CNT if bool(MULTILINGUAL_QUERY_EXPANSION) else 0)
    )


# buffer just to be safe so that we don't overflow the token limit due to
# a small miscalculation
_MISC_BUFFER = 40


def compute_max_document_tokens(
    persona: Persona,
    actual_user_input: str | None = None,
    max_llm_token_override: int | None = None,
) -> int:
    """Estimates the number of tokens available for context documents. Formula is roughly:

    (
        model_context_window - reserved_output_tokens - prompt_tokens
        - (actual_user_input OR reserved_user_message_tokens) - buffer (just to be safe)
    )

    The actual_user_input is used at query time. If we are calculating this before knowing the exact input (e.g.
    if we're trying to determine if the user should be able to select another document) then we just set an
    arbitrary "upper bound".
    """
    llm_name = GEN_AI_MODEL_VERSION
    if persona.llm_model_version_override:
        llm_name = persona.llm_model_version_override

    # if we can't find a number of tokens, just assume some common default
    max_input_tokens = (
        max_llm_token_override
        if max_llm_token_override
        else get_max_input_tokens(model_name=llm_name)
    )
    if persona.prompts:
        # TODO this may not always be the first prompt
        prompt_tokens = get_prompt_tokens(persona.prompts[0])
    else:
        raise RuntimeError("Persona has no prompts - this should never happen")
    user_input_tokens = (
        check_number_of_tokens(actual_user_input)
        if actual_user_input is not None
        else GEN_AI_SINGLE_USER_MESSAGE_EXPECTED_MAX_TOKENS
    )

    return max_input_tokens - prompt_tokens - user_input_tokens - _MISC_BUFFER


def compute_max_llm_input_tokens(persona: Persona) -> int:
    """Maximum tokens allows in the input to the LLM (of any type)."""
    llm_name = GEN_AI_MODEL_VERSION
    if persona.llm_model_version_override:
        llm_name = persona.llm_model_version_override

    input_tokens = get_max_input_tokens(model_name=llm_name)
    return input_tokens - _MISC_BUFFER
