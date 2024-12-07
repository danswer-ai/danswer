from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.prompts import INITIAL_RAG_PROMPT
from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def generate_initial(state: QAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE INITIAL---")
    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]
    print(f"Number of verified retrieval docs - base: {len(docs)}")

    sub_question_answers = state["initial_sub_qas"]

    sub_question_answers_list = []

    _SUB_QUESTION_ANSWER_TEMPLATE = """
    Sub-Question:\n  - {sub_question}\n  --\nAnswer:\n  - {sub_answer}\n\n
    """
    for sub_question_answer_dict in sub_question_answers:
        if (
            sub_question_answer_dict["sub_answer_check"] == "yes"
            and len(sub_question_answer_dict["sub_answer"]) > 0
            and sub_question_answer_dict["sub_answer"] != "I don't know"
        ):
            sub_question_answers_list.append(
                _SUB_QUESTION_ANSWER_TEMPLATE.format(
                    sub_question=sub_question_answer_dict["sub_question"],
                    sub_answer=sub_question_answer_dict["sub_answer"],
                )
            )

    sub_question_answer_str = "\n\n------\n\n".join(sub_question_answers_list)

    msg = [
        HumanMessage(
            content=INITIAL_RAG_PROMPT.format(
                question=question,
                context=format_docs(docs),
                answered_sub_questions=sub_question_answer_str,
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    return {
        "base_answer": response.pretty_repr(),
        "log_messages": generate_log_message(
            message="core - generate initial",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
