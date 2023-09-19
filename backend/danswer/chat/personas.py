import yaml
from sqlalchemy.orm import Session

from danswer.chat.chat_prompts import form_tool_section_text
from danswer.configs.app_configs import PERSONAS_YAML
from danswer.db.chat import create_persona
from danswer.db.engine import get_sqlalchemy_engine


def load_personas_from_yaml(personas_yaml: str = PERSONAS_YAML) -> None:
    with open(personas_yaml, "r") as file:
        data = yaml.safe_load(file)

    all_personas = data.get("personas", [])
    with Session(get_sqlalchemy_engine(), expire_on_commit=False) as db_session:
        for persona in all_personas:
            tools = form_tool_section_text(
                persona["tools"], persona["retrieval_enabled"]
            )
            create_persona(
                persona_id=persona["id"],
                name=persona["name"],
                retrieval_enabled=persona["retrieval_enabled"],
                system_text=persona["system"],
                tools_text=tools,
                hint_text=persona["hint"],
                default_persona=True,
                db_session=db_session,
            )
