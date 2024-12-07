from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


# aggregate sub questions and answers
def sub_qa_level_aggregator(state: QAState) -> dict[str, Any]:
    sub_qas = state["sub_qas"]

    node_start_time = datetime.now()

    dynamic_context_list = [
        "Below you will find useful information to answer the original question:"
    ]
    checked_sub_qas = []

    for core_answer_sub_qa in sub_qas:
        question = core_answer_sub_qa["sub_question"]
        answer = core_answer_sub_qa["sub_answer"]
        verified = core_answer_sub_qa["sub_answer_check"]

        if verified == "yes":
            dynamic_context_list.append(
                f"Question:\n{question}\n\nAnswer:\n{answer}\n\n---\n\n"
            )
            checked_sub_qas.append({"sub_question": question, "sub_answer": answer})
    dynamic_context = "\n".join(dynamic_context_list)

    return {
        "core_answer_dynamic_context": dynamic_context,
        "checked_sub_qas": checked_sub_qas,
        "log_messages": generate_log_message(
            message="deep - sub qa level aggregator",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
