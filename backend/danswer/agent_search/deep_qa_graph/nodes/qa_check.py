import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.deep_qa_graph.prompts import SUB_CHECK_PROMPT
from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def qa_check(state: ResearchQAState) -> dict[str, Any]:
    """
    Check whether the final output satisfies the original user question

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with the final decision
    """

    print("---CHECK SUB QUTPUT---")
    node_start_time = datetime.now()

    sub_answer = state["sub_question_answer"]
    sub_question = state["sub_question"]

    msg = [
        HumanMessage(
            content=SUB_CHECK_PROMPT.format(
                sub_question=sub_question, sub_answer=sub_answer
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = list(
        model.stream(
            prompt=msg,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    raw_response = json.loads(response[0].pretty_repr())
    formatted_response = BinaryDecision.model_validate(raw_response)

    return {
        "sub_question_answer_check": formatted_response.decision,
        "log_messages": generate_log_message(
            message=f"sub - qa check: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
