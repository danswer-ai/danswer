from langchain.schema import SystemMessage, BaseMessage, HumanMessage

from danswer.db.models import ChatMessage
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt, translate_danswer_msg_to_langchain
from danswer.prompts.chat_prompts import REQUIRE_SEARCH_SYSTEM_MSG, REQUIRE_SEARCH_HINT, YES_SEARCH, NO_SEARCH, \
    QUERY_REPHRASE_SYSTEM_MSG, QUERY_REPHRASE_USER_MSG


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


def check_if_need_search(
    query_message: ChatMessage,
    history: list[ChatMessage],
    llm: LLM,
) -> bool:
    # Always start with a retrieval
    if not history:
        return True

    prompt_msgs: list[BaseMessage] = [SystemMessage(content=REQUIRE_SEARCH_SYSTEM_MSG)]
    prompt_msgs.extend([translate_danswer_msg_to_langchain(msg) for msg in history])

    last_query = query_message.message

    prompt_msgs.append(HumanMessage(content=f"{last_query}\n\n{REQUIRE_SEARCH_HINT}"))

    model_out = llm.invoke(prompt_msgs)

    if (NO_SEARCH.split()[0] + " ").lower() in model_out.lower():
        return False

    return True


def history_based_query_rephrase(
    query_message: ChatMessage,
    history: list[ChatMessage],
    llm: LLM,
) -> str:
    user_query = query_message.message
    prompt_msgs: list[BaseMessage] = []

    if not user_query:
        raise ValueError("Can't rephrase/search an empty query")

    if not history:
        return query_message.message

    prompt_msgs.append(SystemMessage(content=QUERY_REPHRASE_SYSTEM_MSG))

    prompt_msgs.extend(
        [translate_danswer_msg_to_langchain(msg) for msg in history]
    )

    last_query = query_message.message

    prompt_msgs.append(
        HumanMessage(
            content=QUERY_REPHRASE_USER_MSG.format(final_query=last_query)
        )
    )

    return llm.invoke(prompt_msgs)
