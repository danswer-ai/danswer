import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.interfaces import LLM


def rewrite(state: ResearchQAState) -> dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---SUB TRANSFORM QUERY---")
    node_start_time = datetime.now()

    question = state["sub_question"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    fast_llm: LLM = state["fast_llm"]
    llm_response = list(
        fast_llm.stream(
            prompt=msg,
            structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )

    # Get the rewritten queries in a defined format
    rewritten_queries: RewrittenQueries = json.loads(llm_response[0].pretty_repr())

    print(f"rewritten_queries: {rewritten_queries}")

    rewritten_queries = RewrittenQueries(
        rewritten_queries=[
            "music hard to listen to",
            "Music that is not fun or pleasant",
        ]
    )

    print(f"hardcoded rewritten_queries: {rewritten_queries}")

    return {
        "sub_question_rewritten_queries": rewritten_queries,
        "log_messages": generate_log_message(
            message="sub - rewrite",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
