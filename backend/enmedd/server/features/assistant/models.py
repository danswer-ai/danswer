from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from enmedd.db.models import Assistant
from enmedd.db.models import StarterMessage
from enmedd.search.enums import RecencyBiasSetting
from enmedd.server.features.document_set.models import DocumentSet
from enmedd.server.features.prompt.models import PromptSnapshot
from enmedd.server.features.tool.api import ToolSnapshot
from enmedd.server.models import MinimalUserSnapshot
from enmedd.utils.logger import setup_logger

logger = setup_logger()


class CreateAssistantRequest(BaseModel):
    name: str
    description: str
    num_chunks: float
    llm_relevance_filter: bool
    is_public: bool
    llm_filter_extraction: bool
    recency_bias: RecencyBiasSetting
    prompt_ids: list[int]
    document_set_ids: list[int]
    # e.g. ID of SearchTool or ImageGenerationTool or <USER_DEFINED_TOOL>
    tool_ids: list[int]
    llm_model_provider_override: str | None = None
    llm_model_version_override: str | None = None
    starter_messages: list[StarterMessage] | None = None
    # For Private Assistants, who should be able to access these
    users: list[UUID] = Field(default_factory=list)
    groups: list[int] = Field(default_factory=list)
    icon_color: str | None = None
    icon_shape: int | None = None
    uploaded_image_id: str | None = None  # New field for uploaded image
    remove_image: bool | None = None
    is_default_assistant: bool = False
    display_priority: int | None = None
    search_start_date: datetime | None = None


class AssistantSnapshot(BaseModel):
    id: int
    owner: MinimalUserSnapshot | None
    name: str
    is_visible: bool
    is_public: bool
    display_priority: int | None
    description: str
    num_chunks: float | None
    llm_relevance_filter: bool
    llm_filter_extraction: bool
    llm_model_provider_override: str | None
    llm_model_version_override: str | None
    starter_messages: list[StarterMessage] | None
    builtin_assistant: bool
    prompts: list[PromptSnapshot]
    tools: list[ToolSnapshot]
    document_sets: list[DocumentSet]
    users: list[MinimalUserSnapshot]
    groups: list[int]
    icon_color: str | None
    icon_shape: int | None
    uploaded_image_id: str | None = None
    is_default_assistant: bool
    search_start_date: datetime | None = None

    @classmethod
    def from_model(
        cls, assistant: Assistant, allow_deleted: bool = False
    ) -> "AssistantSnapshot":
        if assistant.deleted:
            error_msg = f"Assistant with ID {assistant.id} has been deleted"
            if not allow_deleted:
                raise ValueError(error_msg)
            else:
                logger.warning(error_msg)

        return AssistantSnapshot(
            id=assistant.id,
            name=assistant.name,
            owner=(
                MinimalUserSnapshot(
                    id=assistant.user.id,
                    email=assistant.user.email,
                    is_custom_profile=assistant.user.is_custom_profile,
                )
                if assistant.user
                else None
            ),
            is_visible=assistant.is_visible,
            is_public=assistant.is_public,
            display_priority=assistant.display_priority,
            description=assistant.description,
            num_chunks=assistant.num_chunks,
            llm_relevance_filter=assistant.llm_relevance_filter,
            llm_filter_extraction=assistant.llm_filter_extraction,
            llm_model_provider_override=assistant.llm_model_provider_override,
            llm_model_version_override=assistant.llm_model_version_override,
            starter_messages=assistant.starter_messages,
            builtin_assistant=assistant.builtin_assistant,
            is_default_assistant=assistant.is_default_assistant,
            prompts=[PromptSnapshot.from_model(prompt) for prompt in assistant.prompts],
            tools=[ToolSnapshot.from_model(tool) for tool in assistant.tools],
            document_sets=[
                DocumentSet.from_model(document_set_model)
                for document_set_model in assistant.document_sets
            ],
            users=[
                MinimalUserSnapshot(
                    id=user.id,
                    email=user.email,
                    is_custom_profile=user.is_custom_profile,
                )
                for user in assistant.users
            ],
            groups=[user_group.id for user_group in assistant.groups],
            icon_color=assistant.icon_color,
            icon_shape=assistant.icon_shape,
            uploaded_image_id=assistant.uploaded_image_id,
            search_start_date=assistant.search_start_date,
        )


class PromptTemplateResponse(BaseModel):
    final_prompt_template: str


class AssistantShareRequest(BaseModel):
    user_ids: list[UUID]
