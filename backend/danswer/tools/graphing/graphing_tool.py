import base64
import json
import os
import re
import traceback
from collections.abc import Generator
from io import BytesIO
from typing import Any

import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns

from danswer.dynamic_configs.interface import JSON_ro
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM
from danswer.prompts.chat_prompts import (
    GRAPHING_QUERY_REPHRASE,
)  # You'll need to create this
from danswer.secondary_llm_flows.query_expansion import history_based_query_rephrase
from danswer.tools.graphing.models import GraphingError
from danswer.tools.graphing.models import GraphingResponse
from danswer.tools.graphing.models import GraphingResult
from danswer.tools.tool import Tool
from danswer.tools.tool import ToolResponse
from danswer.utils.logger import setup_logger

matplotlib.use("Agg")  # Use non-interactive backend


logger = setup_logger()

GRAPHING_RESPONSE_ID = "graphing_response"
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


# system_message = """
# You are an AI assistant specialized in creating Python code for generating graphs using matplotlib and Seaborn.
# When given a request for a graph, you should generate complete Python code that uses matplotlib
# to create the requested graph. The code should:
# 1. Import necessary libraries (matplotlib, seaborn, numpy if needed) USE SEARBON
# 2. Define the data (you can create sample data that fits the request)
# 3. Create the plot using matplotlib and Seaborn
# 4. Set appropriate labels, title, and legend
# 5. Use plt.figure() to create the figure and assign it to a variable named 'fig'
# 6. Do not include plt.show() at the end of the code
# 7. Make sure to import things like `plt`

# Ensure the code is complete and can be executed as-is to generate the graph.
# Do not wrap the code in markdown code blocks or use any other formatting.
# Simply provide the raw Python code.


# """

system_message = """
You create Python code for graphs using matplotlib and Seaborn. Your code should:

1. Import libraries: matplotlib.pyplot as plt, seaborn as sns, numpy as np
2. Define data (create sample data if needed)
3. Create the plot:
   - Use plt.figure(figsize=(10, 6)) and assign to 'fig'
   - Use Seaborn with keyword args: sns.lineplot(x=x_data, y=y_data)
4. Set labels, title, legend using plt functions
5. Not include plt.show()

Key points:
- Always use keyword args (x=, y=) in Seaborn functions
- Use 'plt' for matplotlib and 'sns' for Seaborn functions
- Provide raw Python code without formatting
```"""


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

    def tool_definition(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Python code to generate the graph using matplotlib and seaborn",
                        },
                    },
                    "required": ["code"],
                },
            },
        }

    def check_if_needs_graphing(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
    ) -> bool:
        history_str = "\n".join([f"{m.message}" for m in history])
        prompt = GRAPHING_TEMPLATE.format(
            chat_history=history_str,
            final_query=query,
        )
        use_graphing_output = llm.invoke(prompt)

        logger.debug(f"Evaluated if should use graphing: {use_graphing_output}")

        return YES_GRAPHING.lower() in use_graphing_output.content.lower()

    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        if not force_run and not self.check_if_needs_graphing(query, history, llm):
            return None

        rephrased_query = history_based_query_rephrase(
            query=query,
            history=history,
            llm=llm,
            prompt_template=GRAPHING_QUERY_REPHRASE,
        )

        return {
            "code": rephrased_query,
        }

    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        graph_response = next(arg for arg in args if arg.id == GRAPHING_RESPONSE_ID)
        return json.dumps(graph_response.response.dict())

    @staticmethod
    def preprocess_code(code: str) -> str:
        return re.sub(r"^```[\w]*\n|```$", "", code, flags=re.MULTILINE).strip()

    def run(self, **kwargs: str) -> Generator[ToolResponse, None, None]:
        code = kwargs["code"]

        code = self.preprocess_code(code)

        locals_dict = {"plt": plt, "matplotlib": matplotlib, "sns": sns}

        try:
            exec(code, globals(), locals_dict)

            fig = locals_dict.get("fig")

            if fig is None:
                raise ValueError("The provided code did not create a 'fig' variable")

            # NOTE: Saves the plot to a file (for testing purposes)
            # filename = f"generated_graph_{len(os.listdir(self.output_dir)) + 1}.png"
            # filepath = os.path.join(self.output_dir, filename)
            # fig.savefig(filepath, bbox_inches="tight")
            # logger.info(f"Graph saved to: {filepath}")

            buf = BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight")
            img_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            graph_result = GraphingResult(image=img_base64)
            response = GraphingResponse(graph_result=graph_result)

            yield ToolResponse(id=GRAPHING_RESPONSE_ID, response=response)

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
