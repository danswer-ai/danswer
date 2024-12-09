from typing import Any

from danswer.agent_search.core_qa_graph.states import BaseQAState


def final_format(state: BaseQAState) -> dict[str, Any]:
    """
    Create the final output for the QA subgraph
    """

    print("---BASE FINAL FORMAT---")

    return {
        "sub_qas": [
            {
                "sub_question": state["sub_question_str"],
                "sub_answer": state["sub_question_answer"],
                "sub_answer_check": state["sub_question_answer_check"],
            }
        ],
        "log_messages": state["log_messages"],
    }
