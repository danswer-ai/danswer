from typing import cast

from fastapi import HTTPException
from sqlalchemy.orm import Session

from enmedd.auth.users import is_user_admin
from enmedd.db.assistant import get_prompts_by_ids
from enmedd.db.llm import fetch_existing_doc_sets
from enmedd.db.llm import fetch_existing_tools
from enmedd.db.models import Assistant
from enmedd.db.models import Prompt
from enmedd.db.models import Tool
from enmedd.db.models import User
from enmedd.one_shot_answer.models import AssistantConfig
from enmedd.tools.custom.custom_tool import (
    build_custom_tools_from_openapi_schema_and_headers,
)


def create_temporary_assistant(
    assistant_config: AssistantConfig, db_session: Session, user: User | None = None
) -> Assistant:
    if not is_user_admin(user):
        raise HTTPException(
            status_code=403,
            detail="User is not authorized to create a assistant in one shot queries",
        )

    """Create a temporary Assistant object from the provided configuration."""
    assistant = Assistant(
        name=assistant_config.name,
        description=assistant_config.description,
        num_chunks=assistant_config.num_chunks,
        llm_relevance_filter=assistant_config.llm_relevance_filter,
        llm_filter_extraction=assistant_config.llm_filter_extraction,
        recency_bias=assistant_config.recency_bias,
        llm_model_provider_override=assistant_config.llm_model_provider_override,
        llm_model_version_override=assistant_config.llm_model_version_override,
    )

    if assistant_config.prompts:
        assistant.prompts = [
            Prompt(
                name=p.name,
                description=p.description,
                system_prompt=p.system_prompt,
                task_prompt=p.task_prompt,
                include_citations=p.include_citations,
                datetime_aware=p.datetime_aware,
            )
            for p in assistant_config.prompts
        ]
    elif assistant_config.prompt_ids:
        assistant.prompts = get_prompts_by_ids(
            db_session=db_session, prompt_ids=assistant_config.prompt_ids
        )

    assistant.tools = []
    if assistant_config.custom_tools_openapi:
        for schema in assistant_config.custom_tools_openapi:
            tools = cast(
                list[Tool],
                build_custom_tools_from_openapi_schema_and_headers(schema),
            )
            assistant.tools.extend(tools)

    if assistant_config.tools:
        tool_ids = [tool.id for tool in assistant_config.tools]
        assistant.tools.extend(
            fetch_existing_tools(db_session=db_session, tool_ids=tool_ids)
        )

    if assistant_config.tool_ids:
        assistant.tools.extend(
            fetch_existing_tools(
                db_session=db_session, tool_ids=assistant_config.tool_ids
            )
        )

    fetched_docs = fetch_existing_doc_sets(
        db_session=db_session, doc_ids=assistant_config.document_set_ids
    )
    assistant.document_sets = fetched_docs

    return assistant
