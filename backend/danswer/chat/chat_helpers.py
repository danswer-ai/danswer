from danswer.configs.app_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.db.models import Prompt
from collections.abc import Callable
from langchain.schema.messages import SystemMessage, HumanMessage
from functools import lru_cache
from danswer.db.models import ChatMessage
from danswer.one_shot_answer.qa_block import build_context_str
from danswer.indexing.models import InferenceChunk
from typing import cast

from danswer.prompts.chat_prompts import REQUIRE_CITATION_STATEMENT, CHAT_USER_PROMPT, DEFAULT_IGNORE_STATEMENT, \
    CITATION_REMINDER
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.prompt_utils import get_current_llm_day_time
from danswer.server.chat.models import LlmDoc


@lru_cache()
def build_chat_system_message(
    prompt: Prompt,
    llm_tokenizer: Callable,
    citation_line: str = REQUIRE_CITATION_STATEMENT
) -> tuple[SystemMessage, int]:
    system_prompt = prompt.system_prompt
    if prompt.include_citations:
        system_prompt += citation_line
    if prompt.datetime_aware:
        system_prompt += f"\n\nAdditional Information:\n\t- {get_current_llm_day_time()}."

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


def llm_doc_from_inference_chunk(
    inf_chunk: InferenceChunk
) -> LlmDoc:
    return LlmDoc(
        content=inf_chunk.content,
        semantic_identifier=inf_chunk.semantic_identifier,
        source_type=inf_chunk.source_type,
        updated_at=inf_chunk.updated_at,
        link=inf_chunk.source_links[0] if inf_chunk.source_links else None
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
    context_docs_str = build_context_str(cast(list[LlmDoc | InferenceChunk], context_docs))
    optional_ignore = "" if all_doc_useful else ignore_str

    task_prompt_with_reminder = build_task_prompt_reminders(prompt)

    user_prompt = user_prompt_template.format(
        optional_ignore_statement=optional_ignore,
        context_docs_str=context_docs_str,
        task_prompt=task_prompt_with_reminder,
        user_query=user_query
    )

    token_count = len(llm_tokenizer(user_prompt))
    user_msg = HumanMessage(content=user_prompt)

    return user_msg, token_count
