from danswer.llm.build import get_default_llm
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt


def get_chat_name_messages(user_query: str) -> list[dict[str, str]]:
    messages = [
        {
            "role": "system",
            "content": "Give a short name for this chat session based on the user's first message.",
        },
        {"role": "user", "content": user_query},
    ]
    return messages


def get_new_chat_name(user_query: str) -> str:
    messages = get_chat_name_messages(user_query)
    filled_llm_prompt = dict_based_prompt_to_langchain_prompt(messages)
    return get_default_llm().invoke(filled_llm_prompt)
