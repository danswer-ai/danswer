import yaml
from sqlalchemy.orm import Session

from enmedd.configs.chat_configs import ASSISTANTS_YAML
from enmedd.configs.chat_configs import INPUT_PROMPT_YAML
from enmedd.configs.chat_configs import MAX_CHUNKS_FED_TO_CHAT
from enmedd.configs.chat_configs import PROMPTS_YAML
from enmedd.db.assistant import get_prompt_by_name
from enmedd.db.assistant import upsert_assistant
from enmedd.db.assistant import upsert_prompt
from enmedd.db.document_set import get_or_create_document_set_by_name
from enmedd.db.input_prompt import insert_input_prompt_if_not_exists
from enmedd.db.models import Assistant
from enmedd.db.models import DocumentSet as DocumentSetDBModel
from enmedd.db.models import Prompt as PromptDBModel
from enmedd.db.models import Tool as ToolDBModel
from enmedd.search.enums import RecencyBiasSetting


def load_prompts_from_yaml(
    db_session: Session, prompts_yaml: str = PROMPTS_YAML
) -> None:
    with open(prompts_yaml, "r") as file:
        data = yaml.safe_load(file)

    all_prompts = data.get("prompts", [])
    for prompt in all_prompts:
        upsert_prompt(
            user=None,
            prompt_id=prompt.get("id"),
            name=prompt["name"],
            description=prompt["description"].strip(),
            system_prompt=prompt["system"].strip(),
            task_prompt=prompt["task"].strip(),
            include_citations=prompt["include_citations"],
            datetime_aware=prompt.get("datetime_aware", True),
            default_prompt=True,
            assistants=None,
            db_session=db_session,
            commit=True,
        )


def load_assistants_from_yaml(
    db_session: Session,
    ASSISTANTS_YAML: str = ASSISTANTS_YAML,
    default_chunks: float = MAX_CHUNKS_FED_TO_CHAT,
) -> None:
    with open(ASSISTANTS_YAML, "r") as file:
        data = yaml.safe_load(file)

    all_assistants = data.get("assistants", [])
    for assistant in all_assistants:
        doc_set_names = assistant["document_sets"]
        doc_sets: list[DocumentSetDBModel] = [
            get_or_create_document_set_by_name(db_session, name)
            for name in doc_set_names
        ]

        # Assume if user hasn't set any document sets for the assistant, the user may want
        # to later attach document sets to the assistant manually, therefore, don't overwrite/reset
        # the document sets for the assistant
        doc_set_ids: list[int] | None = None
        if doc_sets:
            doc_set_ids = [doc_set.id for doc_set in doc_sets]
        else:
            doc_set_ids = None

        prompt_ids: list[int] | None = None
        prompt_set_names = assistant["prompts"]
        if prompt_set_names:
            prompts: list[PromptDBModel | None] = [
                get_prompt_by_name(prompt_name, user=None, db_session=db_session)
                for prompt_name in prompt_set_names
            ]
            if any([prompt is None for prompt in prompts]):
                raise ValueError("Invalid Assistant configs, not all prompts exist")

            if prompts:
                prompt_ids = [prompt.id for prompt in prompts if prompt is not None]

        p_id = assistant.get("id")
        tool_ids = []
        if assistant.get("image_generation"):
            image_gen_tool = (
                db_session.query(ToolDBModel)
                .filter(ToolDBModel.name == "ImageGenerationTool")
                .first()
            )
            if image_gen_tool:
                tool_ids.append(image_gen_tool.id)

        llm_model_provider_override = assistant.get("llm_model_provider_override")
        llm_model_version_override = assistant.get("llm_model_version_override")

        # Set specific overrides for image generation assistant
        if assistant.get("image_generation"):
            llm_model_version_override = "gpt-4o"

        existing_assistant = (
            db_session.query(Assistant)
            .filter(Assistant.name == assistant["name"])
            .first()
        )

        upsert_assistant(
            user=None,
            assistant_id=(-1 * p_id) if p_id is not None else None,
            name=assistant["name"],
            description=assistant["description"],
            num_chunks=assistant.get("num_chunks")
            if assistant.get("num_chunks") is not None
            else default_chunks,
            llm_relevance_filter=assistant.get("llm_relevance_filter"),
            starter_messages=assistant.get("starter_messages"),
            llm_filter_extraction=assistant.get("llm_filter_extraction"),
            icon_shape=assistant.get("icon_shape"),
            icon_color=assistant.get("icon_color"),
            llm_model_provider_override=llm_model_provider_override,
            llm_model_version_override=llm_model_version_override,
            recency_bias=RecencyBiasSetting(assistant["recency_bias"]),
            prompt_ids=prompt_ids,
            document_set_ids=doc_set_ids,
            tool_ids=tool_ids,
            builtin_assistant=True,
            is_public=True,
            display_priority=existing_assistant.display_priority
            if existing_assistant is not None
            else assistant.get("display_priority"),
            is_visible=existing_assistant.is_visible
            if existing_assistant is not None
            else assistant.get("is_visible"),
            db_session=db_session,
        )


def load_input_prompts_from_yaml(
    db_session: Session, input_prompts_yaml: str = INPUT_PROMPT_YAML
) -> None:
    with open(input_prompts_yaml, "r") as file:
        data = yaml.safe_load(file)

    all_input_prompts = data.get("input_prompts", [])
    for input_prompt in all_input_prompts:
        # If these prompts are deleted (which is a hard delete in the DB), on server startup
        # they will be recreated, but the user can always just deactivate them, just a light inconvenience

        insert_input_prompt_if_not_exists(
            user=None,
            input_prompt_id=input_prompt.get("id"),
            prompt=input_prompt["prompt"],
            content=input_prompt["content"],
            is_public=input_prompt["is_public"],
            active=input_prompt.get("active", True),
            db_session=db_session,
            commit=True,
        )


def load_chat_yamls(
    db_session: Session,
    prompt_yaml: str = PROMPTS_YAML,
    ASSISTANTS_YAML: str = ASSISTANTS_YAML,
    input_prompts_yaml: str = INPUT_PROMPT_YAML,
) -> None:
    load_prompts_from_yaml(db_session, prompt_yaml)
    load_assistants_from_yaml(db_session, ASSISTANTS_YAML)
    load_input_prompts_from_yaml(db_session, input_prompts_yaml)
