from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import CODE_BLOCK_PAT

TOOL_TEMPLATE = """TOOLS
------
Assistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:

{}

RESPONSE FORMAT INSTRUCTIONS
----------------------------

When responding to me, please output a response in one of two formats:

**Option 1:**
Use this if you want the human to use a tool.
Markdown code snippet formatted in the following schema:

```json
{{
    "action": string, \\ The action to take. Must be one of {}
    "action_input": string \\ The input to the action
}}
```

**Option #2:**
Use this if you want to respond directly to the human. Markdown code snippet formatted in the following schema:

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
Here is the user's input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):

{}
"""

TOOL_FOLLOWUP = """
TOOL RESPONSE: 
---------------------
{}

USER'S INPUT
--------------------
Okay, so what is the response to my last comment? If using information obtained from the tools you must mention it explicitly without mentioning the tool names - I have forgotten all TOOL RESPONSES!
{}
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

    user_prompt += user_input_prompt.format(query)

    if hint_text:
        if user_prompt[-1] != "\n":
            user_prompt += "\n"
        user_prompt += "Hint: " + hint_text

    return user_prompt


def form_tool_section_text(
    tools: list[dict[str, str]], template: str = TOOL_TEMPLATE
) -> str | None:
    if not tools:
        return None

    tools_intro = []
    for tool in tools:
        description_formatted = tool['description'].replace('\n', ' ')
        tools_intro.append(f"> {tool['name']}: {description_formatted}")

    tools_intro_text = "\n".join(tools_intro)
    tool_names_text = ", ".join([tool["name"] for tool in tools])

    return template.format(tools_intro_text, tool_names_text)


def format_danswer_chunks_for_chat(chunks: list[InferenceChunk]) -> str:
    return "\n".join(
        f"DOCUMENT {ind}:{CODE_BLOCK_PAT.format(chunk.content)}" for ind, chunk in enumerate(chunks, start=1)
    )


def form_tool_followup_text(
    tool_output: str,
    hint_text: str | None,
    tool_followup_prompt: str = TOOL_FOLLOWUP,
    ignore_hint: bool = False
) -> str:
    if not ignore_hint and hint_text:
        hint_text_spaced = f"\n{hint_text}\n"
        return tool_followup_prompt.format(tool_output, hint_text_spaced)

    return tool_followup_prompt.format(tool_output, "")