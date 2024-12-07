import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.prompts import BASE_CHECK_PROMPT
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.factory import get_default_llms


def sub_qa_check(state: BaseQAState) -> dict[str, Any]:
    """
    Check if the sub-question answer is satisfactory.

    Args:
        state: The current SubQAState containing the sub-question and its answer

    Returns:
        dict containing the check result and log message
    """
    node_start_time = datetime.datetime.now()

    msg = [
        HumanMessage(
            content=BASE_CHECK_PROMPT.format(
                question=state["sub_question_str"],
                base_answer=state["sub_question_answer"],
            )
        )
    ]

    _, fast_llm = get_default_llms()
    response = list(
        fast_llm.stream(
            prompt=msg,
            # structured_response_format=None,
        )
    )

    response_str = merge_message_runs(response, chunk_separator="")[0].content

    return {
        "sub_question_answer_check": response_str,
        "base_answer_messages": generate_log_message(
            message="sub - qa_check",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
