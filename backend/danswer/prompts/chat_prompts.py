from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.prompts.constants import CODE_BLOCK_PAT


YES_SEARCH = "Yes Search"
NO_SEARCH = "No Search"
REQUIRE_SEARCH_SYSTEM_MSG = f"""
You are a large language model whose only job is to determine if the system should call an \
external search tool to be able to answer the user's last message.

Respond with "{NO_SEARCH}" if:
- there is sufficient information in chat history to fully answer the user query
- there is enough knowledge in the LLM to fully answer the user query
- the user query does not rely on any specific knowledge

Respond with "{YES_SEARCH}" if:
- additional knowledge about entities, processes, problems, or anything else could lead to a better answer.
- there is some uncertainty what the user is referring to

Respond with EXACTLY and ONLY "{YES_SEARCH}" or "{NO_SEARCH}"
"""


REQUIRE_SEARCH_HINT = f"""
Hint: respond with EXACTLY {YES_SEARCH} or {NO_SEARCH}"
""".strip()


QUERY_REPHRASE_SYSTEM_MSG = """
Given a conversation (between Human and Assistant) and a final message from Human, \
rewrite the last message to be a standalone question which captures required/relevant context \
from previous messages. This question must be useful for a semantic search engine. \
It is used for a natural language search
""".strip()


QUERY_REPHRASE_USER_MSG = """
Help me rewrite this final message into a standalone query that takes into consideration the \
past messages of the conversation IF relevant. This query is used with a semantic search engine to \
retrieve documents. You must ONLY return the rewritten query and NOTHING ELSE. \
IMPORTANT, the search engine does not have access to the conversation history!

Query:
{final_query}
""".strip()


def format_danswer_chunks_for_chat(chunks: list[InferenceChunk]) -> str:
    if not chunks:
        return "No Results Found"

    return "\n".join(
        f"DOCUMENT {ind}:\n{CODE_BLOCK_PAT.format(chunk.content)}\n"
        for ind, chunk in enumerate(chunks, start=1)
    )




