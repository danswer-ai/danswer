import yaml
from sqlalchemy.orm import Session

from danswer.configs.app_configs import PERSONAS_YAML
from danswer.db.chat import create_persona
from danswer.db.engine import get_sqlalchemy_engine

TOOL_TEMPLATE = """
TOOLS:
------

You have access to the following tools:

{}

To use a tool, please use the following format:

```
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [{}]
Action Input: the input to the action
Observation: the result of the action
```

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

```
Thought: Do I need to use a tool? No
AI: [your response here]
```
"""


def form_tool_section_text(
    tools: list[dict[str, str]], template: str = TOOL_TEMPLATE
) -> str:
    tools_intro = []
    for tool in tools:
        tools_intro.append(f"> {tool['name']}: {tool['description']}")

    tools_intro_text = "\n".join(tools_intro)
    tool_names_text = ", ".join([tool["name"] for tool in tools])

    return template.format(tools_intro_text, tool_names_text)


def load_personas_from_yaml(personas_yaml: str = PERSONAS_YAML) -> None:
    with open(personas_yaml, "r") as file:
        data = yaml.safe_load(file)

    all_personas = data.get("personas", [])
    with Session(get_sqlalchemy_engine(), expire_on_commit=False) as db_session:
        for persona in all_personas:
            tool_text = form_tool_section_text(persona["tools"])
            create_persona(
                persona_id=persona["id"],
                name=persona["name"],
                system_text=persona["system"],
                tools_text=tool_text,
                hint_text=persona["hint"],
                default_persona=True,
                db_session=db_session,
            )
