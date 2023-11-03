from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import ToolInfo
from danswer.indexing.models import InferenceChunk
from danswer.llm.utils import translate_danswer_msg_to_langchain
from danswer.prompts.constants import CODE_BLOCK_PAT

DANSWER_TOOL_NAME = "Current Search"
DANSWER_TOOL_DESCRIPTION = (
    "A search tool that can find information on any topic "
    "including up to date and proprietary knowledge."
)

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

TOOL_TEMPLATE = """
TOOLS
------
You can use tools to look up information that may be helpful in answering the user's \
original question. The available tools are:

{tool_overviews}

RESPONSE FORMAT INSTRUCTIONS
----------------------------
When responding to me, please output a response in one of two formats:

**Option 1:**
Use this if you want to use a tool. Markdown code snippet formatted in the following schema:

```json
{{
    "action": string, \\ The action to take. {tool_names}
    "action_input": string \\ The input to the action
}}
```

**Option #2:**
Use this if you want to respond directly to the user. Markdown code snippet formatted in the following schema:

```json
{{
    "action": "Final Answer",
    "action_input": string \\ You should put what you want to return to use here
}}
```
"""

TOOL_LESS_PROMPT = """
Respond with a markdown code snippet in the following schema:

```json
{{
    "action": "Final Answer",
    "action_input": string \\ You should put what you want to return to use here
}}
```
"""

USER_INPUT = """
USER'S INPUT
--------------------
Here is the user's input \
(remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):

{user_input}
"""

TOOL_FOLLOWUP = """
TOOL RESPONSE:
---------------------
{tool_output}

USER'S INPUT
--------------------
Okay, so what is the response to my last comment? If using information obtained from the tools you must \
mention it explicitly without mentioning the tool names - I have forgotten all TOOL RESPONSES!
If the tool response is not useful, ignore it completely.
{optional_reminder}{hint}
IMPORTANT! You MUST respond with a markdown code snippet of a json blob with a single action, and NOTHING else.
"""


TOOL_LESS_FOLLOWUP = """
Refer to the following documents when responding to my final query. Ignore any documents that are not relevant.

CONTEXT DOCUMENTS:
---------------------
{context_str}

FINAL QUERY:
--------------------
{user_query}

{hint_text}
"""


def form_user_prompt_text(
    query: str,
    tool_text: str | None,
    hint_text: str | None,
    user_input_prompt: str = USER_INPUT,
    tool_less_prompt: str = TOOL_LESS_PROMPT,
) -> str:
    user_prompt = tool_text or tool_less_prompt

    user_prompt += user_input_prompt.format(user_input=query)

    if hint_text:
        if user_prompt[-1] != "\n":
            user_prompt += "\n"
        user_prompt += "\nHint: " + hint_text

    return user_prompt.strip()


def form_tool_section_text(
    tools: list[ToolInfo] | None, retrieval_enabled: bool, template: str = TOOL_TEMPLATE
) -> str | None:
    if not tools and not retrieval_enabled:
        return None

    if retrieval_enabled and tools:
        tools.append(
            {"name": DANSWER_TOOL_NAME, "description": DANSWER_TOOL_DESCRIPTION}
        )

    tools_intro = []
    if tools:
        num_tools = len(tools)
        for tool in tools:
            description_formatted = tool["description"].replace("\n", " ")
            tools_intro.append(f"> {tool['name']}: {description_formatted}")

        prefix = "Must be one of " if num_tools > 1 else "Must be "

        tools_intro_text = "\n".join(tools_intro)
        tool_names_text = prefix + ", ".join([tool["name"] for tool in tools])

    else:
        return None

    return template.format(
        tool_overviews=tools_intro_text, tool_names=tool_names_text
    ).strip()


def format_danswer_chunks_for_chat(chunks: list[InferenceChunk]) -> str:
    if not chunks:
        return "No Results Found"

    return "\n".join(
        f"DOCUMENT {ind}:\n{CODE_BLOCK_PAT.format(chunk.content)}\n"
        for ind, chunk in enumerate(chunks, start=1)
    )


def form_tool_followup_text(
    tool_output: str,
    query: str,
    hint_text: str | None,
    tool_followup_prompt: str = TOOL_FOLLOWUP,
    ignore_hint: bool = False,
) -> str:
    # If multi-line query, it likely confuses the model more than helps
    if "\n" not in query:
        optional_reminder = f"\nAs a reminder, my query was: {query}\n"
    else:
        optional_reminder = ""

    if not ignore_hint and hint_text:
        hint_text_spaced = f"\nHint: {hint_text}\n"
    else:
        hint_text_spaced = ""

    return tool_followup_prompt.format(
        tool_output=tool_output,
        optional_reminder=optional_reminder,
        hint=hint_text_spaced,
    ).strip()


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


def form_tool_less_followup_text(
    tool_output: str,
    query: str,
    hint_text: str | None,
    tool_followup_prompt: str = TOOL_LESS_FOLLOWUP,
) -> str:
    hint = f"Hint: {hint_text}" if hint_text else ""
    return tool_followup_prompt.format(
        context_str=tool_output, user_query=query, hint_text=hint
    ).strip()
