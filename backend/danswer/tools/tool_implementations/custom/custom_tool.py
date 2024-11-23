import csv
import json
import uuid
from collections.abc import Generator
from io import BytesIO
from io import StringIO
from typing import Any
from typing import cast
from typing import Dict
from typing import List

import requests
from langchain_core.messages import HumanMessage
from langchain_core.messages import SystemMessage
from pydantic import BaseModel
from requests import JSONDecodeError

from danswer.chat.chat_utils import llm_doc_from_inference_section
from danswer.chat.models import LlmDoc
from danswer.chat.models import SectionRelevancePiece
from danswer.configs.constants import FileOrigin
from danswer.db.engine import get_session_with_default_tenant
from danswer.file_store.file_store import get_default_file_store
from danswer.file_store.models import ChatFileType
from danswer.key_value_store.interface import JSON_ro
from danswer.llm.answering.models import AnswerStyleConfig
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.answering.models import PromptConfig
from danswer.llm.answering.prompts.build import AnswerPromptBuilder
from danswer.llm.interfaces import LLM
from danswer.search.models import DocumentSource
from danswer.search.models import IndexFilters
from danswer.search.models import InferenceChunk
from danswer.search.models import InferenceSection
from danswer.tools.base_tool import BaseTool
from danswer.tools.message import ToolCallSummary
from danswer.tools.models import CHAT_SESSION_ID_PLACEHOLDER
from danswer.tools.models import DynamicSchemaInfo
from danswer.tools.models import MESSAGE_ID_PLACEHOLDER
from danswer.tools.models import ToolResponse
from danswer.tools.tool_implementations.custom.custom_tool_prompts import (
    SHOULD_USE_CUSTOM_TOOL_SYSTEM_PROMPT,
)
from danswer.tools.tool_implementations.custom.custom_tool_prompts import (
    SHOULD_USE_CUSTOM_TOOL_USER_PROMPT,
)
from danswer.tools.tool_implementations.custom.custom_tool_prompts import (
    TOOL_ARG_SYSTEM_PROMPT,
)
from danswer.tools.tool_implementations.custom.custom_tool_prompts import (
    TOOL_ARG_USER_PROMPT,
)
from danswer.tools.tool_implementations.custom.custom_tool_prompts import USE_TOOL
from danswer.tools.tool_implementations.custom.models import CUSTOM_TOOL_RESPONSE_ID
from danswer.tools.tool_implementations.custom.models import CustomToolCallSummary
from danswer.tools.tool_implementations.custom.models import CustomToolFileResponse
from danswer.tools.tool_implementations.custom.models import CustomToolResponseType
from danswer.tools.tool_implementations.custom.models import CustomToolSearchResponse
from danswer.tools.tool_implementations.custom.models import CustomToolSearchResult
from danswer.tools.tool_implementations.custom.openapi_parsing import MethodSpec
from danswer.tools.tool_implementations.custom.openapi_parsing import (
    openapi_to_method_specs,
)
from danswer.tools.tool_implementations.custom.openapi_parsing import openapi_to_url
from danswer.tools.tool_implementations.custom.openapi_parsing import REQUEST_BODY
from danswer.tools.tool_implementations.custom.openapi_parsing import (
    validate_openapi_schema,
)
from danswer.tools.tool_implementations.file_like_tool_utils import (
    build_next_prompt_for_file_like_tool,
)
from danswer.tools.tool_implementations.search.search_tool import (
    FINAL_CONTEXT_DOCUMENTS_ID,
)
from danswer.tools.tool_implementations.search.search_tool import (
    SEARCH_RESPONSE_SUMMARY_ID,
)
from danswer.tools.tool_implementations.search.search_tool import SearchResponseSummary
from danswer.tools.tool_implementations.search.search_tool import (
    SECTION_RELEVANCE_LIST_ID,
)
from danswer.tools.tool_implementations.search.search_utils import llm_doc_to_dict
from danswer.tools.tool_implementations.search_like_tool_utils import (
    build_next_prompt_for_search_like_tool,
)
from danswer.utils.headers import header_list_to_header_dict
from danswer.utils.headers import HeaderItemDict
from danswer.utils.logger import setup_logger
from danswer.utils.special_types import JSON_ro

logger = setup_logger()


class CustomTool(BaseTool):
    def __init__(
        self,
        method_spec: MethodSpec,
        base_url: str,
        answer_style_config: AnswerStyleConfig | None = None,
        custom_headers: list[HeaderItemDict] | None = None,
        prompt_config: PromptConfig | None = None,
    ) -> None:
        self._base_url = base_url
        self._method_spec = method_spec
        self._tool_definition = self._method_spec.to_tool_definition()

        self._name = self._method_spec.name
        self._description = self._method_spec.summary
        self.headers = (
            header_list_to_header_dict(custom_headers) if custom_headers else {}
        )
        self.answer_style_config = answer_style_config
        self.prompt_config = prompt_config

    @property
    def name(self) -> str:
        return self._name

    @property
    def description(self) -> str:
        return self._description

    @property
    def display_name(self) -> str:
        return self._name

    """For LLMs which support explicit tool calling"""

    def tool_definition(self) -> dict:
        return self._tool_definition

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        final_context_docs_response = next(
            (
                response
                for response in args
                if response.id == FINAL_CONTEXT_DOCUMENTS_ID
            ),
            None,
        )

        #  Handle the search type response
        if final_context_docs_response:
            final_context_docs = cast(
                list[LlmDoc], final_context_docs_response.response
            )
            return json.dumps(
                {
                    "search_results": [
                        llm_doc_to_dict(doc, ind)
                        for ind, doc in enumerate(final_context_docs)
                    ]
                }
            )

        # Handle other response types
        response = args[0].response
        if isinstance(response, CustomToolCallSummary):
            if response.response_type in [
                CustomToolResponseType.IMAGE,
                CustomToolResponseType.CSV,
            ]:
                file_response = cast(CustomToolFileResponse, response.tool_result)
                return json.dumps({"file_ids": file_response.file_ids})

            # For JSON or other responses, return as-is
            return json.dumps(response.tool_result)

        # If it's not a CustomToolCallSummary or search result, return as-is
        return json.dumps(response)

    """For LLMs which do NOT support explicit tool calling"""

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run:
            should_use_result = llm.invoke(
                [
                    SystemMessage(content=SHOULD_USE_CUSTOM_TOOL_SYSTEM_PROMPT),
                    HumanMessage(
                        content=SHOULD_USE_CUSTOM_TOOL_USER_PROMPT.format(
                            history=history,
                            query=query,
                            tool_name=self.name,
                            tool_description=self.description,
                        )
                    ),
                ]
            )
            if cast(str, should_use_result.content).strip() != USE_TOOL:
                return None

        args_result = llm.invoke(
            [
                SystemMessage(content=TOOL_ARG_SYSTEM_PROMPT),
                HumanMessage(
                    content=TOOL_ARG_USER_PROMPT.format(
                        history=history,
                        query=query,
                        tool_name=self.name,
                        tool_description=self.description,
                        tool_args=self.tool_definition()["function"]["parameters"],
                    )
                ),
            ]
        )
        args_result_str = cast(str, args_result.content)

        try:
            return json.loads(args_result_str.strip())
        except json.JSONDecodeError:
            pass

        # try removing ```
        try:
            return json.loads(args_result_str.strip("```"))
        except json.JSONDecodeError:
            pass

        # try removing ```json
        try:
            return json.loads(args_result_str.strip("```").strip("json"))
        except json.JSONDecodeError:
            pass

        # pretend like nothing happened if not parse-able
        logger.error(
            f"Failed to parse args for '{self.name}' tool. Recieved: {args_result_str}"
        )
        return None

    def _save_and_get_file_references(
        self, file_content: bytes | str, content_type: str
    ) -> List[str]:
        with get_session_with_default_tenant() as db_session:
            file_store = get_default_file_store(db_session)

            file_id = str(uuid.uuid4())

            # Handle both binary and text content
            if isinstance(file_content, str):
                content = BytesIO(file_content.encode())
            else:
                content = BytesIO(file_content)

            file_store.save_file(
                file_name=file_id,
                content=content,
                display_name=file_id,
                file_origin=FileOrigin.CHAT_UPLOAD,
                file_type=content_type,
                file_metadata={
                    "content_type": content_type,
                },
            )

        return [file_id]

    def _parse_csv(self, csv_text: str) -> List[Dict[str, Any]]:
        csv_file = StringIO(csv_text)
        reader = csv.DictReader(csv_file)
        return [row for row in reader]

    """Actual execution of the tool"""

    def _handle_search_like_tool_response(
        self, tool_result: CustomToolSearchResponse
    ) -> Generator[ToolResponse, None, None]:
        # Convert results to InferenceSections
        inference_sections = []
        for result in tool_result.results:
            chunk = InferenceChunk(
                document_id=result.document_id,
                content=result.content,
                semantic_identifier=result.document_id,  # using document_id as semantic_identifier
                blurb=result.blurb,
                source_type=DocumentSource.CUSTOM_TOOL,
                # Use defaults
                chunk_id=0,
                source_links={},
                section_continuation=False,
                title=result.title,
                boost=0,
                recency_bias=0,  # Default recency bias
                hidden=False,
                score=0,
                metadata={},
                match_highlights=[],
                updated_at=result.updated_at,
            )

            # We assume that each search result belongs to different documents
            section = InferenceSection(
                center_chunk=chunk,
                chunks=[chunk],
                combined_content=chunk.content,
            )

            inference_sections.append(section)

        search_response_summary = SearchResponseSummary(
            rephrased_query=None,
            top_sections=inference_sections,
            predicted_flow=None,
            predicted_search=None,
            final_filters=IndexFilters(access_control_list=None),
            recency_bias_multiplier=0.0,
        )

        yield ToolResponse(
            id=SEARCH_RESPONSE_SUMMARY_ID,
            response=search_response_summary,
        )
        # Build selected sections for relevance (assuming all are relevant)
        selected_sections = [
            SectionRelevancePiece(
                relevant=True,
                document_id=section.center_chunk.document_id,
                chunk_id=0,
            )
            for section in inference_sections
        ]

        yield ToolResponse(
            id=SECTION_RELEVANCE_LIST_ID,
            response=selected_sections,
        )

        llm_docs = [
            llm_doc_from_inference_section(section) for section in inference_sections
        ]

        yield ToolResponse(id=FINAL_CONTEXT_DOCUMENTS_ID, response=llm_docs)

    def run(self, **kwargs: Any) -> Generator[ToolResponse, None, None]:
        request_body = kwargs.get(REQUEST_BODY)

        path_params = {}

        for path_param_schema in self._method_spec.get_path_param_schemas():
            path_params[path_param_schema["name"]] = kwargs[path_param_schema["name"]]

        query_params = {}
        for query_param_schema in self._method_spec.get_query_param_schemas():
            if query_param_schema["name"] in kwargs:
                query_params[query_param_schema["name"]] = kwargs[
                    query_param_schema["name"]
                ]

        url = self._method_spec.build_url(self._base_url, path_params, query_params)
        method = self._method_spec.method

        response = requests.request(
            method, url, json=request_body, headers=self.headers
        )
        content_type = response.headers.get("Content-Type", "")

        tool_result: Any
        response_type: str
        if "text/csv" in content_type:
            file_ids = self._save_and_get_file_references(
                response.content, content_type
            )
            tool_result = CustomToolFileResponse(file_ids=file_ids)
            response_type = CustomToolResponseType.CSV

        elif "image/" in content_type:
            file_ids = self._save_and_get_file_references(
                response.content, content_type
            )
            tool_result = CustomToolFileResponse(file_ids=file_ids)
            response_type = CustomToolResponseType.IMAGE

        elif content_type == "application/json":
            tool_result = response.json()

            # Check if the response is a search result
            if isinstance(tool_result, list) and all(
                "content" in item for item in tool_result
            ):
                # Process as search results
                search_results = [
                    CustomToolSearchResult(**item) for item in tool_result
                ]
                tool_result = CustomToolSearchResponse(results=search_results)
                response_type = CustomToolResponseType.SEARCH
            else:
                # Process as generic JSON
                response_type = CustomToolResponseType.JSON

        else:
            # Default to JSON if content type is not specified
            try:
                tool_result = response.json()
                response_type = CustomToolResponseType.JSON
            except JSONDecodeError:
                logger.exception(
                    f"Failed to parse response as JSON for tool '{self._name}'"
                )
                tool_result = response.text
                response_type = CustomToolResponseType.TEXT

        logger.info(
            f"Returning tool response for {self._name} with type {response_type}"
        )
        if response_type == CustomToolResponseType.SEARCH and isinstance(
            tool_result, CustomToolSearchResponse
        ):
            yield from self._handle_search_like_tool_response(tool_result)

        else:
            yield ToolResponse(
                id=CUSTOM_TOOL_RESPONSE_ID,
                response=CustomToolCallSummary(
                    tool_name=self._name,
                    response_type=response_type,
                    tool_result=tool_result,
                ),
            )

    def build_next_prompt(
        self,
        prompt_builder: AnswerPromptBuilder,
        tool_call_summary: ToolCallSummary,
        tool_responses: list[ToolResponse],
        using_tool_calling_llm: bool,
    ) -> AnswerPromptBuilder:
        response = tool_responses[0].response

        if isinstance(response, SearchResponseSummary) and self.prompt_config:
            if not self.answer_style_config or self.answer_style_config.citation_config:
                raise ValueError("Citation config is required for search tools")

            return build_next_prompt_for_search_like_tool(
                prompt_builder=prompt_builder,
                tool_call_summary=tool_call_summary,
                tool_responses=tool_responses,
                using_tool_calling_llm=using_tool_calling_llm,
                answer_style_config=self.answer_style_config,
                prompt_config=self.prompt_config,
            )

        # Handle non-file responses using parent class behavior
        if response.response_type not in [
            CustomToolResponseType.IMAGE,
            CustomToolResponseType.CSV,
        ]:
            return super().build_next_prompt(
                prompt_builder,
                tool_call_summary,
                tool_responses,
                using_tool_calling_llm,
            )

        # Handle file responses
        file_type = (
            ChatFileType.IMAGE
            if response.response_type == CustomToolResponseType.IMAGE
            else ChatFileType.CSV
        )

        return build_next_prompt_for_file_like_tool(
            prompt_builder,
            response.tool_result.file_ids,
            file_type=file_type,
        )

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        response = cast(CustomToolCallSummary, args[0].response)
        if hasattr(response, "tool_result"):
            if isinstance(response.tool_result, CustomToolFileResponse):
                return response.tool_result.model_dump()

            return response.tool_result
        else:
            final_docs = cast(
                list[LlmDoc],
                next(
                    arg.response for arg in args if arg.id == FINAL_CONTEXT_DOCUMENTS_ID
                ),
            )
            # NOTE: need to do this json.loads(doc.json()) stuff because there are some
            # subfields that are not serializable by default (datetime)
            # this forces pydantic to make them JSON serializable for us
            return [json.loads(doc.model_dump_json()) for doc in final_docs]

        # return response.tool_result


def build_custom_tools_from_openapi_schema_and_headers(
    openapi_schema: dict[str, Any],
    answer_style_config: AnswerStyleConfig | None = None,
    custom_headers: list[HeaderItemDict] | None = None,
    dynamic_schema_info: DynamicSchemaInfo | None = None,
    prompt_config: PromptConfig | None = None,
) -> list[CustomTool]:
    if dynamic_schema_info:
        # Process dynamic schema information
        schema_str = json.dumps(openapi_schema)
        placeholders = {
            CHAT_SESSION_ID_PLACEHOLDER: dynamic_schema_info.chat_session_id,
            MESSAGE_ID_PLACEHOLDER: dynamic_schema_info.message_id,
        }

        for placeholder, value in placeholders.items():
            if value:
                schema_str = schema_str.replace(placeholder, str(value))

        openapi_schema = json.loads(schema_str)

    url = openapi_to_url(openapi_schema)
    method_specs = openapi_to_method_specs(openapi_schema)
    return [
        CustomTool(method_spec, url, answer_style_config, custom_headers, prompt_config)
        for method_spec in method_specs
    ]


if __name__ == "__main__":
    import openai

    openapi_schema = {
        "openapi": "3.0.0",
        "info": {
            "version": "1.0.0",
            "title": "Assistants API",
            "description": "An API for managing assistants",
        },
        "servers": [
            {"url": "http://localhost:8080"},
        ],
        "paths": {
            "/assistant/{assistant_id}": {
                "get": {
                    "summary": "Get a specific Assistant",
                    "operationId": "getAssistant",
                    "parameters": [
                        {
                            "name": "assistant_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                },
                "post": {
                    "summary": "Create a new Assistant",
                    "operationId": "createAssistant",
                    "parameters": [
                        {
                            "name": "assistant_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "requestBody": {
                        "required": True,
                        "content": {"application/json": {"schema": {"type": "object"}}},
                    },
                },
            }
        },
    }
    validate_openapi_schema(openapi_schema)

    tools = build_custom_tools_from_openapi_schema_and_headers(
        openapi_schema, dynamic_schema_info=None
    )

    openai_client = openai.OpenAI()
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Can you fetch assistant with ID 10"},
        ],
        tools=[tool.tool_definition() for tool in tools],  # type: ignore
    )
    choice = response.choices[0]
    if choice.message.tool_calls:
        print(choice.message.tool_calls)
        for tool_response in tools[0].run(
            **json.loads(choice.message.tool_calls[0].function.arguments)
        ):
            print(tool_response)
