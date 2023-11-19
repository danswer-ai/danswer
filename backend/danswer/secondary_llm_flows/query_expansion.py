from collections.abc import Callable

from danswer.llm.factory import get_default_llm
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.prompts.secondary_llm_flows import LANGUAGE_REPHRASE_PROMPT
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

        return run_functions_tuples_in_parallel(functions_with_args)

    else:
        return [llm_rephrase_query(query, language) for language in languages]
