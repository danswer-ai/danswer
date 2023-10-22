from datetime import datetime
from typing import Any

import yaml
from sqlalchemy.orm import Session

from danswer.configs.app_configs import PERSONAS_YAML
from danswer.db.chat import upsert_persona
from danswer.db.document_set import get_or_create_document_set_by_name
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import DocumentSet as DocumentSetDBModel
from danswer.db.models import Persona
from danswer.db.models import ToolInfo


def build_system_text_from_persona(persona: Persona) -> str | None:
    text = (persona.system_text or "").strip()
    if persona.datetime_aware:
        current_datetime = datetime.now()
        # Format looks like: "October 16, 2023 14:30"
        formatted_datetime = current_datetime.strftime("%B %d, %Y %H:%M")

        text += (
            "\n\nAdditional Information:\n"
            f"\t- The current date and time is {formatted_datetime}."
        )

    return text or None


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

            doc_set_names = persona["document_sets"]
            doc_sets: list[DocumentSetDBModel] | None = [
                get_or_create_document_set_by_name(db_session, name)
                for name in doc_set_names
            ]

            # Assume if user hasn't set any document sets for the persona, the user may want
            # to later attach document sets to the persona manually, therefore, don't overwrite/reset
            # the document sets for the persona
            if not doc_sets:
                doc_sets = None

            upsert_persona(
                name=persona["name"],
                retrieval_enabled=persona.get("retrieval_enabled", True),
                # Default to knowing the date/time if not specified, however if there is no
                # system prompt, do not interfere with the flow by adding a
                # system prompt that is ONLY the date info, this would likely not be useful
                datetime_aware=persona.get(
                    "datetime_aware", bool(persona.get("system"))
                ),
                system_text=persona.get("system"),
                tools=tools,
                hint_text=persona.get("hint"),
                default_persona=True,
                document_sets=doc_sets,
                db_session=db_session,
            )
