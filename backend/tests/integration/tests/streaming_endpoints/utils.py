from typing import Any
from typing import Dict
from typing import List

from tests.integration.common_utils.test_models import StreamedResponse


def analyze_response(response_data: List[Dict[str, Any]]) -> StreamedResponse:
    analyzed = StreamedResponse()

    for data in response_data:
        if "rephrased_query" in data:
            analyzed.rephrased_query = data["rephrased_query"]
        elif "tool_name" in data:
            analyzed.tool_name = data["tool_name"]
            analyzed.tool_result = (
                data.get("tool_result") if analyzed.tool_name == "run_search" else None
            )
        elif "relevance_summaries" in data:
            analyzed.relevance_summaries = data["relevance_summaries"]
        elif "answer_piece" in data and data["answer_piece"]:
            analyzed.full_message += data["answer_piece"]

    return analyzed
