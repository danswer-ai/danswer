from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.db.models import ChatMessage
from danswer.llm.utils import translate_danswer_msg_to_langchain

DANSWER_TOOL_NAME = "Current Search"
DANSWER_TOOL_DESCRIPTION = (
    "A search tool that can find information on any topic "
    "including up to date and proprietary knowledge."
)

DANSWER_SYSTEM_MSG = (
    "Given a conversation (between Human and Assistant) and a final message from Human, "
    "rewrite the last message to be a standalone question that captures required/relevant context from the previous "
    "conversation messages."
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
    "action": string, \\ The action to take. Must be one of {tool_names}
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
    tools: list[dict[str, str]], retrieval_enabled: bool, template: str = TOOL_TEMPLATE
) -> str | None:
    if not tools and not retrieval_enabled:
        return None

    if retrieval_enabled:
        tools.append(
            {"name": DANSWER_TOOL_NAME, "description": DANSWER_TOOL_DESCRIPTION}
        )

    tools_intro = []
    for tool in tools:
        description_formatted = tool["description"].replace("\n", " ")
        tools_intro.append(f"> {tool['name']}: {description_formatted}")

    tools_intro_text = "\n".join(tools_intro)
    tool_names_text = ", ".join([tool["name"] for tool in tools])

    return template.format(
        tool_overviews=tools_intro_text, tool_names=tool_names_text
    ).strip()


def format_danswer_chunks_for_chat(chunks: list[InferenceChunk]) -> str:
    return "\n".join(
        f"DOCUMENT {ind}:{CODE_BLOCK_PAT.format(chunk.content)}"
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
                "Help me rewrite this final query into a standalone question that takes into consideration the "
                f"past messages of the conversation. You must ONLY return the rewritten query and nothing else."
                f"\n\nQuery:\n{query_message.message}"
            )
        )
    )

    return combined_query_msgs
