from typing import cast

from sqlalchemy.orm import Session

from danswer.db.llm import fetch_existing_doc_sets
from danswer.db.llm import fetch_existing_tools
from danswer.db.models import Persona
from danswer.db.models import Prompt
from danswer.db.models import Tool
from danswer.one_shot_answer.models import PersonaConfig
from danswer.tools.custom.custom_tool import build_custom_tools_from_openapi_schema


def create_temporary_persona(
    persona_config: PersonaConfig, db_session: Session
) -> Persona:
    """Create a temporary Persona object from the provided configuration."""
    persona = Persona(
        name=persona_config.name,
        description=persona_config.description,
        search_type=persona_config.search_type,
        num_chunks=persona_config.num_chunks,
        llm_relevance_filter=persona_config.llm_relevance_filter,
        llm_filter_extraction=persona_config.llm_filter_extraction,
        recency_bias=persona_config.recency_bias,
        llm_model_provider_override=persona_config.llm_model_provider_override,
        llm_model_version_override=persona_config.llm_model_version_override,
        starter_messages=str(persona_config.starter_messages),  # Convert to JSON string
        default_persona=persona_config.default_persona,
        is_visible=persona_config.is_visible,
        display_priority=persona_config.display_priority,
        deleted=persona_config.deleted,
        is_public=persona_config.is_public,
    )

    persona.prompts = [
        Prompt(
            name=p.name,
            description=p.description,
            system_prompt=p.system_prompt,
            task_prompt=p.task_prompt,
            include_citations=p.include_citations,
            datetime_aware=p.datetime_aware,
        )
        for p in persona_config.prompts
    ]

    persona.tools = []
    if persona_config.custom_tools_openapi:
        for schema in persona_config.custom_tools_openapi:
            tools = cast(
                list[Tool],
                build_custom_tools_from_openapi_schema(schema),
            )
            persona.tools.extend(tools)

    if persona_config.tools:
        tool_ids = [tool.id for tool in persona_config.tools]
        persona.tools = fetch_existing_tools(db_session=db_session, tool_ids=tool_ids)

    doc_set_ids = [d.id for d in persona_config.document_sets]
    fetched_docs = fetch_existing_doc_sets(db_session=db_session, doc_ids=doc_set_ids)
    persona.document_sets = fetched_docs
    return persona
