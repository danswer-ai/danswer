from collections.abc import Callable

from danswer.chat.chat_utils import combine_message_chain
from danswer.db.models import ChatMessage
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.prompts.chat_prompts import HISTORY_QUERY_REPHRASE
from danswer.prompts.miscellaneous_prompts import LANGUAGE_REPHRASE_PROMPT
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel

logger = setup_logger()


def llm_rephrase_query(query: str, language: str) -> str:
    def _get_rephrase_messages() -> list[dict[str, str]]:
        messages = [
            {
                "role": "user",
                "content": LANGUAGE_REPHRASE_PROMPT.format(
                    query=query, target_language=language
                ),
            },
        ]

        return messages

    messages = _get_rephrase_messages()
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)
    logger.debug(model_output)

    return model_output


def rephrase_query(
    query: str,
    multilingual_query_expansion: str,
    use_threads: bool = True,
) -> list[str]:
    languages = multilingual_query_expansion.split(",")
    languages = [language.strip() for language in languages]
    if use_threads:
        functions_with_args: list[tuple[Callable, tuple]] = [
            (llm_rephrase_query, (query, language)) for language in languages
        ]

        query_rephrases = run_functions_tuples_in_parallel(functions_with_args)
        return query_rephrases

    else:
        query_rephrases = [
            llm_rephrase_query(query, language) for language in languages
        ]
        return query_rephrases


def history_based_query_rephrase(
    query_message: ChatMessage,
    history: list[ChatMessage],
    llm: LLM | None = None,
) -> str:
    def _get_history_rephrase_messages(
        question: str,
        history_str: str,
    ) -> list[dict[str, str]]:
        messages = [
            {
                "role": "user",
                "content": HISTORY_QUERY_REPHRASE.format(
                    question=question, chat_history=history_str
                ),
            },
        ]

        return messages

    user_query = query_message.message

    if not user_query:
        raise ValueError("Can't rephrase/search an empty query")

    if not history:
        return query_message.message

    history_str = combine_message_chain(history)

    prompt_msgs = _get_history_rephrase_messages(
        question=user_query, history_str=history_str
    )

    if llm is None:
        llm = get_default_llm()

    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(prompt_msgs)
    rephrased_query = llm.invoke(filled_llm_prompt)

    logger.debug(f"Rephrased combined query: {rephrased_query}")

    return rephrased_query
