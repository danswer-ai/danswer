from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import ToolInfo
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.prompts.constants import CODE_BLOCK_PAT


DANSWER_SYSTEM_MSG = (
    "Given a conversation (between Human and Assistant) and a final message from Human, "
    "rewrite the last message to be a standalone question which captures required/relevant context "
    "from previous messages. This question must be useful for a semantic search engine. "
    "It is used for a natural language search."
)


YES_SEARCH = "Yes Search"
NO_SEARCH = "No Search"
REQUIRE_DANSWER_SYSTEM_MSG = (
    "You are a large language model whose only job is to determine if the system should call an external search tool "
    "to be able to answer the user's last message.\n"
    f'\nRespond with "{NO_SEARCH}" if:\n'
    f"- there is sufficient information in chat history to fully answer the user query\n"
    f"- there is enough knowledge in the LLM to fully answer the user query\n"
    f"- the user query does not rely on any specific knowledge\n"
    f'\nRespond with "{YES_SEARCH}" if:\n'
    "- additional knowledge about entities, processes, problems, or anything else could lead to a better answer.\n"
    "- there is some uncertainty what the user is referring to\n\n"
    f'Respond with EXACTLY and ONLY "{YES_SEARCH}" or "{NO_SEARCH}"'
)


def format_danswer_chunks_for_chat(chunks: list[InferenceChunk]) -> str:
    if not chunks:
        return "No Results Found"

    return "\n".join(
        f"DOCUMENT {ind}:\n{CODE_BLOCK_PAT.format(chunk.content)}\n"
        for ind, chunk in enumerate(chunks, start=1)
    )


def build_combined_query(
    query_message: ChatMessage,
    history: list[ChatMessage],
) -> list[BaseMessage]:
    user_query = query_message.message
    combined_query_msgs: list[BaseMessage] = []

    if not user_query:
        raise ValueError("Can't rephrase/search an empty query")

    combined_query_msgs.append(SystemMessage(content=DANSWER_SYSTEM_MSG))

    combined_query_msgs.extend(
        [translate_danswer_msg_to_langchain(msg) for msg in history]
    )

    combined_query_msgs.append(
        HumanMessage(
            content=(
                "Help me rewrite this final message into a standalone query that takes into consideration the "
                f"past messages of the conversation if relevant. This query is used with a semantic search engine to "
                f"retrieve documents. You must ONLY return the rewritten query and nothing else. "
                f"Remember, the search engine does not have access to the conversation history!"
                f"\n\nQuery:\n{query_message.message}"
            )
        )
    )

    return combined_query_msgs


def form_require_search_single_msg_text(
    query_message: ChatMessage,
    history: list[ChatMessage],
) -> str:
    prompt = "MESSAGE_HISTORY\n---------------\n" if history else ""

    for msg in history:
        if msg.message_type == MessageType.ASSISTANT:
            prefix = "AI"
        else:
            prefix = "User"
        prompt += f"{prefix}:\n```\n{msg.message}\n```\n\n"

    prompt += f"\nFINAL QUERY:\n---------------\n{query_message.message}"

    return prompt


def form_require_search_text(query_message: ChatMessage) -> str:
    return (
        query_message.message
        + f"\n\nHint: respond with EXACTLY {YES_SEARCH} or {NO_SEARCH}"
    )

