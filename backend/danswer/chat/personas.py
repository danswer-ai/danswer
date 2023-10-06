from typing import Any

import yaml
from sqlalchemy.orm import Session

from danswer.configs.app_configs import PERSONAS_YAML
from danswer.db.chat import upsert_persona
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import ToolInfo


def validate_tool_info(item: Any) -> ToolInfo:
    if not (
        isinstance(item, dict)
        and "name" in item
        and isinstance(item["name"], str)
        and "description" in item
        and isinstance(item["description"], str)
    ):
        raise ValueError(
            "Invalid Persona configuration yaml Found, not all tools have name/description"
        )
    return ToolInfo(name=item["name"], description=item["description"])


def load_personas_from_yaml(personas_yaml: str = PERSONAS_YAML) -> None:
    with open(personas_yaml, "r") as file:
        data = yaml.safe_load(file)

    all_personas = data.get("personas", [])
    with Session(get_sqlalchemy_engine(), expire_on_commit=False) as db_session:
        for persona in all_personas:
            tools = [validate_tool_info(tool) for tool in persona["tools"]]

            upsert_persona(
                persona_id=persona["id"],
                name=persona["name"],
                retrieval_enabled=persona["retrieval_enabled"],
                system_text=persona["system"],
                tools=tools,
                hint_text=persona["hint"],
                default_persona=True,
                db_session=db_session,
            )
