from langchain.schema import BaseMessage
from langchain.schema import HumanMessage
from langchain.schema import SystemMessage

from danswer.db.models import ChatMessage
from danswer.llm.interfaces import LLM
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.prompts.chat_prompts import NO_SEARCH
from danswer.prompts.chat_prompts import REQUIRE_SEARCH_HINT
from danswer.prompts.chat_prompts import REQUIRE_SEARCH_SYSTEM_MSG
from danswer.utils.logger import setup_logger


logger = setup_logger()


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
