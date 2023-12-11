from collections.abc import Callable
from functools import lru_cache
from typing import cast

from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.app_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.db.models import ChatMessage
from danswer.db.models import Prompt
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import check_number_of_tokens
from danswer.prompts.chat_prompts import CHAT_USER_PROMPT
from danswer.prompts.chat_prompts import CITATION_REMINDER
from danswer.prompts.chat_prompts import DEFAULT_IGNORE_STATEMENT
from danswer.prompts.chat_prompts import REQUIRE_CITATION_STATEMENT
from danswer.prompts.constants import CODE_BLOCK_PAT
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.prompt_utils import get_current_llm_day_time
from danswer.server.chat.models import LlmDoc


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


def build_context_str(
    context_docs: list[LlmDoc | InferenceChunk],
    include_metadata: bool = True,
) -> str:
    context = ""
    for doc in context_docs:
        if include_metadata:
            context += f"NEW DOCUMENT: {doc.semantic_identifier}\n"
            context += f"Source: {clean_up_source(doc.source_type)}\n"
            if doc.updated_at:
                update_str = doc.updated_at.strftime("%B %d, %Y %H:%M")
                context += f"Updated: {update_str}\n"
        context += f"{CODE_BLOCK_PAT.format(doc.content.strip())}\n\n\n"
    return context.strip()


@lru_cache()
def build_chat_system_message(
    prompt: Prompt,
    llm_tokenizer: Callable,
    citation_line: str = REQUIRE_CITATION_STATEMENT,
) -> tuple[SystemMessage, int]:
    system_prompt = prompt.system_prompt
    if prompt.include_citations:
        system_prompt += citation_line
    if prompt.datetime_aware:
        system_prompt += (
            f"\n\nAdditional Information:\n\t- {get_current_llm_day_time()}."
        )

    token_count = len(llm_tokenizer(system_prompt))
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
    language_hint_or_nothing = language_hint_str if use_language_hint else ""
    return base_task + citation_or_nothing + language_hint_or_nothing


def llm_doc_from_inference_chunk(inf_chunk: InferenceChunk) -> LlmDoc:
    return LlmDoc(
        content=inf_chunk.content,
        semantic_identifier=inf_chunk.semantic_identifier,
        source_type=inf_chunk.source_type,
        updated_at=inf_chunk.updated_at,
        link=inf_chunk.source_links[0] if inf_chunk.source_links else None,
    )


def build_chat_user_message(
    chat_message: ChatMessage,
    prompt: Prompt,
    context_docs: list[LlmDoc],
    llm_tokenizer: Callable,
    all_doc_useful: bool,
    user_prompt_template: str = CHAT_USER_PROMPT,
    ignore_str: str = DEFAULT_IGNORE_STATEMENT,
) -> tuple[HumanMessage, int]:
    # TODO contextless version
    user_query = chat_message.message
    context_docs_str = build_context_str(
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

    token_count = len(llm_tokenizer(user_prompt))
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
    token_limit: float | None = NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL,
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
