import re
from collections.abc import Iterator

from danswer.direct_qa.qa_block import dict_based_prompt_to_langchain_prompt
from danswer.llm.build import get_default_llm

REASONING_PAT = "REASONING: "
ANSWERABLE_PAT = "ANSWERABLE: "
COT_PAT = "\nLet's think step by step"


def get_query_validation_messages(user_query: str) -> list[dict[str, str]]:
    messages = [
        {
            "role": "system",
            "content": f"You are a helper tool to determine if a query is answerable using retrieval augmented "
            f"generation. A system will try to answer the user query based on ONLY the top 5 most relevant "
            f"documents found from search. Sources contain both up to date and proprietary information for "
            f"the specific team. For named or unknown entities, assume the search will always find "
            f"consistent knowledge about the entity. Determine if that system should attempt to answer. "
            f'"{ANSWERABLE_PAT}" must be exactly "True" or "False"',
        },
        {"role": "user", "content": "What is this Slack channel about?"},
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}First the system must determine which Slack channel is being referred to."
            f"By fetching 5 documents related to Slack channel contents, it is not possible to determine"
            f"which Slack channel the user is referring to.\n{ANSWERABLE_PAT}False",
        },
        {
            "role": "user",
            "content": f"Danswer is unreachable.{COT_PAT}",
        },
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}The system searches documents related to Danswer being "
            f"unreachable. Assuming the documents from search contains situations where Danswer is not "
            f"reachable and contains a fix, the query is answerable.\n{ANSWERABLE_PAT}True",
        },
        {"role": "user", "content": f"How many customers do we have?{COT_PAT}"},
        {
            "role": "assistant",
            "content": f"{REASONING_PAT}Assuming the searched documents contains customer acquisition information"
            f"including a list of customers, the query can be answered.\n{ANSWERABLE_PAT}True",
        },
        {"role": "user", "content": user_query + COT_PAT},
    ]

    return messages


def get_query_answerability(user_query: str) -> tuple[str, bool]:
    messages = get_query_validation_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    model_output = get_default_llm().invoke(filled_llm_prompt)

    reasoning_match = re.search(
        f"{REASONING_PAT}(.*?){ANSWERABLE_PAT}", model_output, re.DOTALL
    )
    reasoning_text = reasoning_match.group(1).strip() if reasoning_match else ""

    answerable_match = re.search(f"{ANSWERABLE_PAT}(.+)", model_output)
    answerable_text = answerable_match.group(1).strip() if answerable_match else ""
    answerable = True if answerable_text.strip().lower() in ["true", "yes"] else False

    return reasoning_text, answerable


def stream_query_answerability(user_query: str) -> Iterator[str]:
    messages = get_query_validation_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    return get_default_llm().stream(filled_llm_prompt)
