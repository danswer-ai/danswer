import json
from collections.abc import Generator
from typing import Any

import pandas as pd

from danswer.dynamic_configs.interface import JSON_ro
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger

logger = setup_logger()

CSV_ANALYSIS_RESPONSE_ID = "csv_analysis_response"

YES_ANALYSIS = "Yes Analysis"
SKIP_ANALYSIS = "Skip Analysis"

ANALYSIS_TEMPLATE = f"""
Given the conversation history and a follow up query,
determine if the system should analyze a CSV file to better answer the latest user input.
Your default response is {SKIP_ANALYSIS}.
Respond "{YES_ANALYSIS}" if:
- The user is asking about the structure or content of a CSV file.
- The user explicitly requests information about a data file.
Conversation History:
{{chat_history}}
If you are at all unsure, respond with {SKIP_ANALYSIS}.
Respond with EXACTLY and ONLY "{YES_ANALYSIS}" or "{SKIP_ANALYSIS}"
Follow Up Input:
{{final_query}}
""".strip()

system_message = """
You analyze CSV files by examining their structure and content.
Your analysis should include:
1. Number of columns and their names
2. Data types of each column
3. First few rows of data
4. Basic statistics (if applicable)
Provide a concise summary of the file's content and structure.
"""


class CSVAnalysisTool(Tool):
    _NAME = "analyze_csv"
    _DISPLAY_NAME = "CSV Analysis Tool"
    _DESCRIPTION = system_message

    @property
    def name(self) -> str:
        return self._NAME

    @property
    def description(self) -> str:
        return self._DESCRIPTION

    @property
    def display_name(self) -> str:
        return self._DISPLAY_NAME

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the CSV file to analyze",
                        },
                    },
                    "required": ["file_path"],
                },
            },
        }

    def check_if_needs_analysis(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
    ) -> bool:
        history_str = "\n".join([f"{m.message}" for m in history])
        prompt = ANALYSIS_TEMPLATE.format(
            chat_history=history_str,
            final_query=query,
        )
        use_analysis_output = llm.invoke(prompt)

        logger.debug(f"Evaluated if should use CSV analysis: {use_analysis_output}")
        content = use_analysis_output.content
        print(content)

        return YES_ANALYSIS.lower() in str(content).lower()

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run and not self.check_if_needs_analysis(query, history, llm):
            return None

        return {
            "prompt": query,
        }

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        graph_response = next(arg for arg in args if arg.id == CSV_ANALYSIS_RESPONSE_ID)
        return json.dumps(graph_response.response.dict())

    def run(
        self, llm: LLM | None = None, **kwargs: str
    ) -> Generator[ToolResponse, None, None]:
        if llm is not None:
            logger.warning("LLM passed to CSVAnalysisTool.run() but not used")

        file_path = kwargs["file_path"]

        try:
            # Read the first few rows of the CSV file
            df = pd.read_csv(file_path, nrows=5)

            # Analyze the structure and content
            analysis = {
                "num_columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "data_types": df.dtypes.astype(str).tolist(),
                "first_rows": df.to_dict(orient="records"),
                "basic_stats": df.describe().to_dict(),
            }

            # Convert the analysis to JSON
            analysis_json = json.dumps(analysis, indent=2)

            yield ToolResponse(id=CSV_ANALYSIS_RESPONSE_ID, response=analysis_json)

        except Exception as e:
            error_msg = f"Error analyzing CSV file: {str(e)}"
            logger.error(error_msg)
            yield ToolResponse(id="ERROR", response=error_msg)

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        try:
            analysis_response = next(
                arg for arg in args if arg.id == CSV_ANALYSIS_RESPONSE_ID
            )
            return json.loads(analysis_response.response)

        except Exception as e:
            return {"error": f"Unexpected error in final_result: {str(e)}"}
