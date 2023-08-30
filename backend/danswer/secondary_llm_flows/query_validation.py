from collections.abc import Iterator

from danswer.direct_qa.qa_block import dict_based_prompt_to_langchain_prompt
from danswer.llm.build import get_default_llm


def get_query_validation_messages(user_query: str) -> list[dict[str, str]]:
    messages = [
        {
            "role": "system",
            "content": "You are a helper tool to determine whether or not a query is answerable using retrieval "
            "augmented generation. A system will try to answer a user query based on the top 5 sources "
            "found from vector/keyword search. The sources are team internal documents containing both "
            "up to date and proprietary information for the specific team and will contain any possible "
            "information about the query. For named or unknown entities, assume the search will find "
            "consistent knowledge about the entity. You must determine if that system should or should not "
            "try to answer. ANSWERABLE must be True or False",
        },
        {"role": "user", "content": "What is this slack channel about?"},
        {
            "role": "assistant",
            "content": "REASONING: There is no way to determine which Slack channel the user is referring to and "
            "the top most relevant documents fetched could be from other channels that the "
            "user is not asking about.\nANSWERABLE: False",
        },
        {
            "role": "user",
            "content": "Postgres is unreachable.",
        },
        {
            "role": "assistant",
            "content": "REASONING: The documents from search may mention situations where Postgres is not "
            "reachable and contain a fix.\nANSWERABLE: True",
        },
        {"role": "user", "content": "How many customers do we have?"},
        {
            "role": "assistant",
            "content": "REASONING: The found documents may contain customer acquisition information including a list "
            "of customers.\nANSWERABLE: True",
        },
        {"role": "user", "content": user_query},
    ]

    return messages


def get_query_answerability(user_query: str) -> Iterator[str]:
    messages = get_query_validation_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    return get_default_llm().stream(filled_llm_prompt)


for token in get_query_answerability("What is Danswer?"):
    print(token)
