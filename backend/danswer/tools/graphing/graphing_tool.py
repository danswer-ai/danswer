import json
import os
import re
import traceback
import uuid
from collections.abc import Generator
from io import BytesIO
from io import StringIO
from typing import Any
from typing import cast

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from danswer.db.engine import get_session_context_manager
from danswer.db.models import FileOrigin
from danswer.dynamic_configs.interface import JSON_ro
from danswer.file_store.file_store import get_default_file_store
from danswer.file_store.models import ChatFileType
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM
from danswer.llm.utils import _process_csv_file
from danswer.prompts.chat_prompts import (
    GRAPHING_GET_FILE_NAME_PROMPT,
)  # You'll need to create this
from danswer.tools.graphing.models import GRAPHING_RESPONSE_ID
from danswer.tools.graphing.models import GraphingError
from danswer.tools.graphing.models import GraphingResponse
from danswer.tools.graphing.models import GraphType
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger

matplotlib.use("Agg")  # Use non-interactive backend


logger = setup_logger()

FINAL_GRAPH_IMAGE = "final_graph_image"

YES_GRAPHING = "Yes Graphing"
SKIP_GRAPHING = "Skip Graphing"

GRAPHING_TEMPLATE = f"""
Given the conversation history and a follow up query,
determine if the system should create a graph to better answer the latest user input.
Your default response is {SKIP_GRAPHING}.
Respond "{YES_GRAPHING}" if:
- The user is asking for information that would be better represented in a graph.
- The user explicitly requests a graph or chart.
Conversation History:
{{chat_history}}
If you are at all unsure, respond with {SKIP_GRAPHING}.
Respond with EXACTLY and ONLY "{YES_GRAPHING}" or "{SKIP_GRAPHING}"
Follow Up Input:
{{final_query}}
""".strip()


system_message = """
You create Python code for graphs using matplotlib. Your code should:
Import libraries: matplotlib.pyplot as plt, numpy as np
Define data (create sample data if needed)
Create the plot:
Use fig, ax = plt.subplots(figsize=(10, 6))
Use ax methods for plotting (e.g., ax.plot(), ax.bar())
Set labels, title, legend using ax methods
Not include plt.show()
Key points:
Use 'ax' for all plotting functions
Use 'plt' only for figure creation and any necessary global settings
Provide raw Python code without formatting
"""

TabError


class GraphingTool(Tool):
    _NAME = "create_graph"
    _DISPLAY_NAME = "Graphing Tool"
    _DESCRIPTION = system_message

    def __init__(self, output_dir: str = "generated_graphs"):
        self.output_dir = output_dir
        try:
            os.makedirs(output_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Error creating output directory: {e}")

    @property
    def name(self) -> str:
        return self._NAME

    @property
    def description(self) -> str:
        return self._DESCRIPTION

    @property
    def display_name(self) -> str:
        return self._DISPLAY_NAME

    # def tool_definition(self) -> dict:
    #         return {
    #             "type": "function",
    #             "function": {
    #                 "name": self.name,
    #                 "description": self.description,
    #                 "parameters": {
    #                     "type": "object",
    #                     "properties": {
    #                         "code": {
    #                             "type": "string",
    #                             "description": "Python code to generate the graph using matplotlib and seaborn",
    #                         },
    #                     },
    #                     "required": ["code"],
    #                 },
    #             },
    #         }

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "filename": {
                            "type": "string",
                            "description": "The name of the file to analyze for graphing purposes",
                        },
                    },
                    "required": ["filename"],
                },
            },
        }

    def check_if_needs_graphing(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
    ) -> bool:
        # return True
        history_str = "\n".join([f"{m.message}" for m in history])
        prompt = GRAPHING_TEMPLATE.format(
            chat_history=history_str,
            final_query=query,
        )
        use_graphing_output = llm.invoke(prompt)
        print(use_graphing_output)

        logger.debug(f"Evaluated if should use graphing: {use_graphing_output}")
        content = use_graphing_output.content

        return YES_GRAPHING.lower() in str(content).lower()

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run and not self.check_if_needs_graphing(query, history, llm):
            return None

        file_names_and_descriptions = []
        for message in history:
            for file in message.files:
                if file.file_type == ChatFileType.CSV:
                    file_name = file.filename
                    description = _process_csv_file(file)
                    file_names_and_descriptions.append(f"{file_name}: {description}")

        # Use the GRAPHING_GET_FILE_NAME_PROMPT to get the file name
        file_list = "\n".join(file_names_and_descriptions)
        prompt = GRAPHING_GET_FILE_NAME_PROMPT.format(
            chat_history="\n".join([f"{m.message}" for m in history]),
            question=query,
            file_list=file_list,
        )

        file_name_response = llm.invoke(prompt)
        file_name = (
            file_name_response.content
            if isinstance(file_name_response.content, str)
            else ""
        )
        file_name = file_name.strip()

        # Validate that the returned file name is in our list of available files
        available_files = [
            name.split(":")[0].strip() for name in file_names_and_descriptions
        ]
        if file_name not in available_files:
            logger.warning(f"LLM returned invalid file name: {file_name}")
            file_name = available_files[0] if available_files else None

        return {
            "filename": file_name,
        }

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        graph_response = next(arg for arg in args if arg.id == GRAPHING_RESPONSE_ID)
        return json.dumps(graph_response.response.dict())

    @staticmethod
    def preprocess_code(code: str) -> str:
        # Extract code between triple backticks
        code_match = re.search(r"```python\n(.*?)```", code, re.DOTALL)
        if code_match:
            return code_match.group(1).strip()
        # If no code block is found, remove any explanatory text and return the rest
        return re.sub(r"^.*?import", "import", code, flags=re.DOTALL).strip()

    @staticmethod
    def is_line_plot(ax: plt.Axes) -> bool:
        return len(ax.lines) > 0

    @staticmethod
    def is_bar_plot(ax: plt.Axes) -> bool:
        return len(ax.patches) > 0 and isinstance(ax.patches[0], plt.Rectangle)

    @staticmethod
    def extract_line_plot_data(ax: plt.Axes) -> dict[str, Any]:
        data = []
        for line in ax.lines:
            line_data = {
                "x": line.get_xdata(),  # type: ignore
                "y": line.get_ydata(),  # type: ignore
                "label": line.get_label(),
                "color": line.get_color(),
            }
            data.append(line_data)

        return {
            "data": data,
            "title": ax.get_title(),
            "xlabel": ax.get_xlabel(),
            "ylabel": ax.get_ylabel(),
        }

    @staticmethod
    def extract_bar_plot_data(ax: plt.Axes) -> dict[str, Any]:
        data = []
        for patch in ax.patches:
            bar_data = {
                "x": float(patch.get_bbox().x0 + patch.get_bbox().width / 2),  # type: ignore
                "y": float(patch.get_bbox().height),  # type: ignore
                "width": float(patch.get_bbox().width),  # type: ignore
                "color": patch.get_facecolor(),
            }
            data.append(bar_data)

        return {
            "data": data,
            "title": ax.get_title(),
            "xlabel": ax.get_xlabel(),
            "ylabel": ax.get_ylabel(),
            "xticks": ax.get_xticks(),
            "xticklabels": [label.get_text() for label in ax.get_xticklabels()],
        }

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        llm: LLM = kwargs["llm"]  # type: ignore
        print("\n\n\n\n\n----values-----\n")
        print("these are the values")
        print(kwargs)

        file_content = kwargs["filename"]
        file_content = file_content.decode("utf-8")
        csv_file = StringIO(file_content)
        df = pd.read_csv(csv_file)

        # Generate a summary of the CSV data
        data_summary = df.describe().to_string()
        columns_info = df.dtypes.to_string()

        # Create a prompt for the LLM to generate the plotting code
        code_generation_prompt = f"""
        {system_message}

        Given the following CSV data summary and user query, create Python code to generate an appropriate graph:

        Data Summary:
        {data_summary}

        Columns:
        {columns_info}

        User Query:
        "Graph the data"

        Generate the Python code to create the graph:
        """

        # Get the code from the LLM
        code_response = llm.invoke(code_generation_prompt)
        code = self.preprocess_code(cast(str, code_response.content))

        # Continue with the existing code to execute and process the graph
        locals_dict = {"plt": plt, "matplotlib": matplotlib, "np": np, "df": df}
        file_id = None

        try:
            exec(code, globals(), locals_dict)

            fig = locals_dict.get("fig")

            if fig is None:
                raise ValueError("The provided code did not create a 'fig' variable")

            ax = fig.gca()  # Get the current Axes

            plot_data = None
            plot_type: GraphType | None = None
            if self.is_line_plot(ax):
                plot_data = self.extract_line_plot_data(ax)
                plot_type = GraphType.LINE_GRAPH
            elif self.is_bar_plot(ax):
                plot_data = self.extract_bar_plot_data(ax)
                plot_type = GraphType.BAR_CHART

            if plot_data:
                plot_data_file = os.path.join(self.output_dir, "plot_data.json")
                with open(plot_data_file, "w") as f:
                    json.dump(plot_data, f)

                with get_session_context_manager() as db_session:
                    file_store = get_default_file_store(db_session)
                    file_id = str(uuid.uuid4())

                    json_content = json.dumps(plot_data)
                    json_bytes = json_content.encode("utf-8")

                    file_store.save_file(
                        file_name=file_id,
                        content=BytesIO(json_bytes),
                        display_name="temporary",
                        file_origin=FileOrigin.CHAT_UPLOAD,
                        file_type="json",
                    )

            buf = BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight")  # type: ignore
            with open("aaa garp.png", "wb") as f:
                f.write(buf.getvalue())

            yield ToolResponse(
                id=GRAPHING_RESPONSE_ID,
                response=GraphingResponse(
                    file_id=str(file_id),
                    graph_type=plot_type.value
                    if plot_type
                    else None,  # Use .value to get the string
                    plot_data=plot_data,  # Pass the dictionary directly, not as a JSON string
                ),
            )

        except Exception as e:
            error_msg = f"Error generating graph: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            yield ToolResponse(id="ERROR", response=GraphingError(error=error_msg))

    def final_result(self, *args: ToolResponse) -> JSON_ro:
        try:
            graph_response = next(arg for arg in args if arg.id == GRAPHING_RESPONSE_ID)
            return graph_response.response.dict()

        except Exception as e:
            return {"error": f"Unexpected error in final_result: {str(e)}"}
