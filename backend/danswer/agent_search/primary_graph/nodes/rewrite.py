import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def rewrite(state: QAState) -> dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        qa_state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """
    print("---STARTING GRAPH---")
    graph_start_time = datetime.now()

    print("---TRANSFORM QUERY---")
    node_start_time = datetime.now()

    question = state["original_question"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]

    # Get the rewritten queries in a defined format
    fast_llm = state["fast_llm"]
    llm_response = list(
        fast_llm.stream(
            prompt=msg,
            structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )

    formatted_response: RewrittenQueries = json.loads(llm_response[0].pretty_repr())

    return {
        "rewritten_queries": formatted_response.rewritten_queries,
        "log_messages": generate_log_message(
            message="core - rewrite",
            node_start_time=node_start_time,
            graph_start_time=graph_start_time,
        ),
    }
