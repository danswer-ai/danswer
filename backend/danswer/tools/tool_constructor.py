from typing import cast
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field
from sqlalchemy.orm import Session

from danswer.configs.app_configs import AZURE_DALLE_API_BASE
from danswer.configs.app_configs import AZURE_DALLE_API_KEY
from danswer.configs.app_configs import AZURE_DALLE_API_VERSION
from danswer.configs.app_configs import AZURE_DALLE_DEPLOYMENT_NAME
from danswer.configs.chat_configs import BING_API_KEY
from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.context.search.enums import LLMEvaluationType
from danswer.context.search.models import InferenceSection
from danswer.context.search.models import RetrievalDetails
from danswer.db.llm import fetch_existing_llm_providers
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.file_store.models import InMemoryChatFile
from danswer.llm.answering.models import AnswerStyleConfig
from danswer.llm.answering.models import CitationConfig
from danswer.llm.answering.models import DocumentPruningConfig
from danswer.llm.answering.models import PromptConfig
from danswer.llm.interfaces import LLM
from danswer.llm.interfaces import LLMConfig
from danswer.natural_language_processing.utils import get_tokenizer
from danswer.tools.built_in_tools import get_built_in_tool_by_id
from danswer.tools.models import DynamicSchemaInfo
from danswer.tools.tool import Tool
from danswer.tools.tool_implementations.custom.custom_tool import (
    build_custom_tools_from_openapi_schema_and_headers,
)
from danswer.tools.tool_implementations.images.image_generation_tool import (
    ImageGenerationTool,
)
from danswer.tools.tool_implementations.internet_search.internet_search_tool import (
    InternetSearchTool,
)
from danswer.tools.tool_implementations.search.search_tool import SearchTool
from danswer.tools.utils import compute_all_tool_tokens
from danswer.tools.utils import explicit_tool_calling_supported
from danswer.utils.headers import header_dict_to_header_list
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _get_image_generation_config(llm: LLM, db_session: Session) -> LLMConfig:
    """Helper function to get image generation LLM config based on available providers"""
    if llm and llm.config.api_key and llm.config.model_provider == "openai":
        return LLMConfig(
            model_provider=llm.config.model_provider,
            model_name="dall-e-3",
            temperature=GEN_AI_TEMPERATURE,
            api_key=llm.config.api_key,
            api_base=llm.config.api_base,
            api_version=llm.config.api_version,
        )

    if llm.config.model_provider == "azure" and AZURE_DALLE_API_KEY is not None:
        return LLMConfig(
            model_provider="azure",
            model_name=f"azure/{AZURE_DALLE_DEPLOYMENT_NAME}",
            temperature=GEN_AI_TEMPERATURE,
            api_key=AZURE_DALLE_API_KEY,
            api_base=AZURE_DALLE_API_BASE,
            api_version=AZURE_DALLE_API_VERSION,
        )

    # Fallback to checking for OpenAI provider in database
    llm_providers = fetch_existing_llm_providers(db_session)
    openai_provider = next(
        iter(
            [
                llm_provider
                for llm_provider in llm_providers
                if llm_provider.provider == "openai"
            ]
        ),
        None,
    )

    if not openai_provider or not openai_provider.api_key:
        raise ValueError("Image generation tool requires an OpenAI API key")

    return LLMConfig(
        model_provider=openai_provider.provider,
        model_name="dall-e-3",
        temperature=GEN_AI_TEMPERATURE,
        api_key=openai_provider.api_key,
        api_base=openai_provider.api_base,
        api_version=openai_provider.api_version,
    )


class SearchToolConfig(BaseModel):
    answer_style_config: AnswerStyleConfig = Field(
        default_factory=lambda: AnswerStyleConfig(citation_config=CitationConfig())
    )
    document_pruning_config: DocumentPruningConfig = Field(
        default_factory=DocumentPruningConfig
    )
    retrieval_options: RetrievalDetails = Field(default_factory=RetrievalDetails)
    selected_sections: list[InferenceSection] | None = None
    chunks_above: int = 0
    chunks_below: int = 0
    full_doc: bool = False
    latest_query_files: list[InMemoryChatFile] | None = None


class InternetSearchToolConfig(BaseModel):
    answer_style_config: AnswerStyleConfig = Field(
        default_factory=lambda: AnswerStyleConfig(
            citation_config=CitationConfig(all_docs_useful=True)
        )
    )


class ImageGenerationToolConfig(BaseModel):
    additional_headers: dict[str, str] | None = None


class CustomToolConfig(BaseModel):
    chat_session_id: UUID | None = None
    message_id: int | None = None
    additional_headers: dict[str, str] | None = None
    answer_style_config: AnswerStyleConfig | None = None
    prompt_config: PromptConfig | None = None


def construct_tools(
    persona: Persona,
    prompt_config: PromptConfig,
    db_session: Session,
    user: User | None,
    llm: LLM,
    fast_llm: LLM,
    search_tool_config: SearchToolConfig | None = None,
    internet_search_tool_config: InternetSearchToolConfig | None = None,
    image_generation_tool_config: ImageGenerationToolConfig | None = None,
    custom_tool_config: CustomToolConfig | None = None,
) -> dict[int, list[Tool]]:
    """Constructs tools based on persona configuration and available APIs"""
    tool_dict: dict[int, list[Tool]] = {}

    for db_tool_model in persona.tools:
        if db_tool_model.in_code_tool_id:
            tool_cls = get_built_in_tool_by_id(db_tool_model.id, db_session)

            # Handle Search Tool
            if tool_cls.__name__ == SearchTool.__name__:
                if not search_tool_config:
                    search_tool_config = SearchToolConfig()

                search_tool = SearchTool(
                    db_session=db_session,
                    user=user,
                    persona=persona,
                    retrieval_options=search_tool_config.retrieval_options,
                    prompt_config=prompt_config,
                    llm=llm,
                    fast_llm=fast_llm,
                    pruning_config=search_tool_config.document_pruning_config,
                    answer_style_config=search_tool_config.answer_style_config,
                    selected_sections=search_tool_config.selected_sections,
                    chunks_above=search_tool_config.chunks_above,
                    chunks_below=search_tool_config.chunks_below,
                    full_doc=search_tool_config.full_doc,
                    evaluation_type=(
                        LLMEvaluationType.BASIC
                        if persona.llm_relevance_filter
                        else LLMEvaluationType.SKIP
                    ),
                )
                tool_dict[db_tool_model.id] = [search_tool]

            # Handle Image Generation Tool
            elif tool_cls.__name__ == ImageGenerationTool.__name__:
                if not image_generation_tool_config:
                    image_generation_tool_config = ImageGenerationToolConfig()

                img_generation_llm_config = _get_image_generation_config(
                    llm, db_session
                )

                tool_dict[db_tool_model.id] = [
                    ImageGenerationTool(
                        api_key=cast(str, img_generation_llm_config.api_key),
                        api_base=img_generation_llm_config.api_base,
                        api_version=img_generation_llm_config.api_version,
                        additional_headers=image_generation_tool_config.additional_headers,
                        model=img_generation_llm_config.model_name,
                    )
                ]

            # Handle Internet Search Tool
            elif tool_cls.__name__ == InternetSearchTool.__name__:
                if not internet_search_tool_config:
                    internet_search_tool_config = InternetSearchToolConfig()

                if not BING_API_KEY:
                    raise ValueError(
                        "Internet search tool requires a Bing API key, please contact your Danswer admin to get it added!"
                    )
                tool_dict[db_tool_model.id] = [
                    InternetSearchTool(
                        api_key=BING_API_KEY,
                        answer_style_config=internet_search_tool_config.answer_style_config,
                        prompt_config=prompt_config,
                    )
                ]

        # Handle custom tools
        elif db_tool_model.openapi_schema:
            if not custom_tool_config:
                custom_tool_config = CustomToolConfig()

            tool_dict[db_tool_model.id] = cast(
                list[Tool],
                build_custom_tools_from_openapi_schema_and_headers(
                    db_tool_model.openapi_schema,
                    dynamic_schema_info=DynamicSchemaInfo(
                        chat_session_id=custom_tool_config.chat_session_id,
                        message_id=custom_tool_config.message_id,
                    ),
                    custom_headers=(db_tool_model.custom_headers or [])
                    + (
                        header_dict_to_header_list(
                            custom_tool_config.additional_headers or {}
                        )
                    ),
                    answer_style_config=custom_tool_config.answer_style_config,
                    prompt_config=custom_tool_config.prompt_config,
                ),
            )

    tools: list[Tool] = []
    for tool_list in tool_dict.values():
        tools.extend(tool_list)

    # factor in tool definition size when pruning
    if search_tool_config:
        search_tool_config.document_pruning_config.tool_num_tokens = (
            compute_all_tool_tokens(
                tools,
                get_tokenizer(
                    model_name=llm.config.model_name,
                    provider_type=llm.config.model_provider,
                ),
            )
        )
        search_tool_config.document_pruning_config.using_tool_message = (
            explicit_tool_calling_supported(
                llm.config.model_provider, llm.config.model_name
            )
        )

    return tool_dict
