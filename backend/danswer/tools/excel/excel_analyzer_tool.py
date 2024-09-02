import json
from collections.abc import Generator
from typing import Any
from typing import cast

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.dynamic_configs.interface import JSON_ro
from danswer.file_store.models import InMemoryChatFile
from danswer.llm.answering.prompts.build import AnswerPromptBuilder, default_build_system_message, \
    default_build_user_message
from danswer.llm.utils import message_to_string
from danswer.secondary_llm_flows.query_expansion import history_based_query_rephrase
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger
from danswer.db.models import Persona, ChatMessage
from danswer.db.models import User
from danswer.llm.answering.models import PromptConfig, PreviousMessage
from danswer.llm.interfaces import LLMConfig, LLM

logger = setup_logger()

EXCEL_ANALYZER_RESPONSE_ID = "excel_analyzer_response"

EXCEL_ANALYZER_TOOL_DESCRIPTION = """
Runs query on LLM to get Excel. 
HINT: if input question as about Excel generation use this tool.
"""

SUMMARIZATION_PROMPT_FOR_TABULAR_DATA = """Your Knowledge expert acting as data analyst, your responsible for generating short summary in 100 words based on give tabular data.
Give tabular data is out of this query {}
Tabular data is {}

analyze above tabular data and user query, try to identify domain data and provide title and summary in paragraphs and bullet points, DONT USE YOUR EXISTING KNOWLEDGE.

"""


class ExcelAnalyzerResponse(BaseModel):
    db_response: str | None = None


class ExcelAnalyzerTool(Tool):
    _NAME = "Tabular_Analyzer"
    _DESCRIPTION = EXCEL_ANALYZER_TOOL_DESCRIPTION
    _DISPLAY_NAME = "Tabular Analyzer Tool"

    def __init__(
            self,
            history: list[PreviousMessage],
            db_session: Session,
            user: User | None,
            persona: Persona,
            prompt_config: PromptConfig,
            llm_config: LLMConfig,
            llm: LLM | None,
            files: list[InMemoryChatFile] | None,
            metadata: dict | None

    ) -> None:
        self.history = history
        self.db_session = db_session
        self.user = user
        self.persona = persona
        self.prompt_config = prompt_config
        self.llm_config = llm_config
        self.llm = llm
        self.files = files
        self.metadata = metadata

    @property
    def name(self) -> str:
        return self._NAME

    @property
    def description(self) -> str:
        return self._DESCRIPTION

    @property
    def display_name(self) -> str:
        return self._DISPLAY_NAME

    """For explicit tool calling"""

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Prompt used to analyze the excel table data",
                        },
                    },
                    "required": ["prompt"],
                },
            },
        }

    def get_args_for_non_tool_calling_llm(
            self,
            query: str,
            history: list[PreviousMessage],
            llm: LLM,
            force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run:
            return None

        rephrased_query = history_based_query_rephrase(
            query=query, history=history, llm=llm
        )
        return {"query": rephrased_query}

    def build_tool_message_content(
            self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        generation_response = args[0]
        tool_text_generations = cast(
            list[ExcelAnalyzerResponse], generation_response.response
        )
        return json.dumps(
            {
                "search_results": [
                    {
                        tool_generation.db_response
                    }
                    for tool_generation in tool_text_generations
                ]
            }
        )

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        query = cast(str, kwargs["query"])

        prompt_builder = AnswerPromptBuilder(self.history, self.llm_config)
        prompt_builder.update_system_prompt(
            default_build_system_message(self.prompt_config)
        )
        prompt_builder.update_user_prompt(
            default_build_user_message(
                user_query=query, prompt_config=self.prompt_config, files=self.files
            )
        )
        prompt = prompt_builder.build()
        tool_output = message_to_string(
            self.llm.invoke(prompt=prompt, metadata=self.metadata)
        )
        yield ToolResponse(
            id=EXCEL_ANALYZER_RESPONSE_ID,
            response=tool_output
        )

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        tool_generation_response = cast(
            list[ToolResponse], args[0].response
        )
        # NOTE: need to do this json.loads(doc.json()) stuff because there are some
        # subfields that are not serializable by default (datetime)
        # this forces pydantic to make them JSON serializable for us
        return tool_generation_response
