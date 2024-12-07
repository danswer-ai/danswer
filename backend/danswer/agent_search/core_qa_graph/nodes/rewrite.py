import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.models import RewrittenQueries
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.factory import get_default_llms


def sub_rewrite(state: BaseQAState) -> dict[str, Any]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print("---SUB TRANSFORM QUERY---")

    node_start_time = datetime.datetime.now()

    # messages = state["base_answer_messages"]
    question = state["sub_question_str"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    _, fast_llm = get_default_llms()
    llm_response_list = list(
        fast_llm.stream(
            prompt=msg,
            # structured_response_format={"type": "json_object", "schema": RewrittenQueries.model_json_schema()},
            # structured_response_format=RewrittenQueries.model_json_schema(),
        )
    )
    llm_response = merge_message_runs(llm_response_list, chunk_separator="")[0].content

    print(f"llm_response: {llm_response}")

    rewritten_queries = llm_response.split("\n")

    print(f"rewritten_queries: {rewritten_queries}")

    rewritten_queries = RewrittenQueries(rewritten_queries=rewritten_queries)

    return {
        "sub_question_search_queries": rewritten_queries,
        "log_messages": generate_log_message(
            message="sub - rewrite",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
