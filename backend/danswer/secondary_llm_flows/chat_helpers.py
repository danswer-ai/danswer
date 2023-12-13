from langchain.schema import BaseMessage
from langchain.schema import HumanMessage
from langchain.schema import SystemMessage

from danswer.configs.model_configs import GEN_AI_HISTORY_CUTOFF
from danswer.db.models import ChatMessage
from danswer.llm.factory import get_default_llm
from danswer.llm.interfaces import LLM
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.prompts.chat_prompts import NO_SEARCH
from danswer.prompts.chat_prompts import REQUIRE_SEARCH_HINT
from danswer.prompts.chat_prompts import REQUIRE_SEARCH_SYSTEM_MSG
from danswer.utils.logger import setup_logger


logger = setup_logger()


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


def combine_message_chain(
    messages: list[ChatMessage],
    msg_limit: int | None = 10,
    token_limit: int | None = GEN_AI_HISTORY_CUTOFF,
) -> str:
    message_strs: list[str] = []
    total_token_count = 0

    if msg_limit is not None:
        messages = messages[-msg_limit:]

    for message in reversed(messages):
        message_token_count = message.token_count

        if (
            token_limit is not None
            and total_token_count + message_token_count > token_limit
        ):
            break

        role = message.message_type.value.upper()
        message_strs.insert(0, f"{role}:\n{message.message}")
        total_token_count += message_token_count

    return "\n\n".join(message_strs)
