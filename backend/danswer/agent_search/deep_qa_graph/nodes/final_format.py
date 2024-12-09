from datetime import datetime
from typing import Any

from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def final_format(state: ResearchQAState) -> dict[str, Any]:
    """
    Create the final output for the QA subgraph
    """

    print("---SUB  FINAL FORMAT---")
    node_start_time = datetime.now()

    return {
        # TODO: Type this
        "sub_qas": [
            {
                "sub_question": state["sub_question"],
                "sub_answer": state["sub_question_answer"],
                "sub_question_nr": state["sub_question_nr"],
                "sub_answer_check": state["sub_question_answer_check"],
            }
        ],
        "log_messages": generate_log_message(
            message="sub - final format",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
