from typing import Any

from onyx.agent_search.main.states import MainState


def sub_qa_manager(state: MainState) -> dict[str, Any]:
    """ """

    sub_questions_dict = state["decomposed_sub_questions_dict"]

    sub_questions = {}

    for sub_question_nr, sub_question_dict in sub_questions_dict.items():
        sub_questions[sub_question_nr] = sub_question_dict["sub_question"]

    return {
        "sub_questions": sub_questions,
        "num_new_question_iterations": 0,
    }
