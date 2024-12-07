from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def sub_qa_manager(state: QAState) -> dict[str, Any]:
    """ """

    node_start_time = datetime.now()

    sub_questions_dict = state["decomposed_sub_questions_dict"]

    sub_questions = {}

    for sub_question_nr, sub_question_dict in sub_questions_dict.items():
        sub_questions[sub_question_nr] = sub_question_dict["sub_question"]

    return {
        "sub_questions": sub_questions,
        "num_new_question_iterations": 0,
        "log_messages": generate_log_message(
            message="deep - sub qa manager",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
