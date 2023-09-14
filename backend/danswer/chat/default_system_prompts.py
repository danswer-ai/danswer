from enum import Enum

from langchain.agents.conversational_chat.prompt import (
    PREFIX as DEFAULT_HELPFUL_LLM_SYSTEM,
)


DEFAULT_TOOLS_TEXT = """
TOOLS:
------

Assistant has access to the following tools:

> Search: useful for when you need to run a search across relevant documents

To use a tool, please use the following format:

```
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [Search]
Action Input: the input to the action
Observation: the result of the action
```

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

```
Thought: Do I need to use a tool? No
AI: [your response here]
```
"""

DEFAULT_HINT = "Hint: be sure to follow the expected output format"
EMPTY_HINT = ""


class SystemMessageDefault(int, Enum):
    DEFAULT = 0


class ToolsMessageDefault(int, Enum):
    DEFAULT = 0


class HintMessageDefault(int, Enum):
    DEFAULT = 0
    EMPTY = 1


SYSTEM_MESSAGE_MAP = {SystemMessageDefault.DEFAULT.value: DEFAULT_HELPFUL_LLM_SYSTEM}

TOOLS_MESSAGE_MAP = {ToolsMessageDefault.DEFAULT.value: DEFAULT_TOOLS_TEXT}

HINT_MESSAGE_MAP = {
    HintMessageDefault.DEFAULT.value: DEFAULT_HINT,
    HintMessageDefault.EMPTY.value: EMPTY_HINT,
}
