import json
import re
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from onyx.agent_search.main.states import MainState
from onyx.agent_search.shared_graph_utils.prompts import DEEP_DECOMPOSE_PROMPT
from onyx.agent_search.shared_graph_utils.utils import format_entity_term_extraction
from onyx.agent_search.shared_graph_utils.utils import generate_log_message


def decompose(state: MainState) -> dict[str, Any]:
    """ """

    node_start_time = datetime.now()

    question = state["original_question"]
    base_answer = state["base_answer"]

    # get the entity term extraction dict and properly format it
    entity_term_extraction_dict = state["retrieved_entities_relationships"][
        "retrieved_entities_relationships"
    ]

    entity_term_extraction_str = format_entity_term_extraction(
        entity_term_extraction_dict
    )

    initial_question_answers = state["initial_sub_qas"]

    addressed_question_list = [
        x["sub_question"]
        for x in initial_question_answers
        if x["sub_answer_check"] == "yes"
    ]
    failed_question_list = [
        x["sub_question"]
        for x in initial_question_answers
        if x["sub_answer_check"] == "no"
    ]

    msg = [
        HumanMessage(
            content=DEEP_DECOMPOSE_PROMPT.format(
                question=question,
                entity_term_extraction_str=entity_term_extraction_str,
                base_answer=base_answer,
                answered_sub_questions="\n - ".join(addressed_question_list),
                failed_sub_questions="\n - ".join(failed_question_list),
            ),
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    cleaned_response = re.sub(r"```json\n|\n```", "", response.pretty_repr())
    parsed_response = json.loads(cleaned_response)

    sub_questions_dict = {}
    for sub_question_nr, sub_question_dict in enumerate(
        parsed_response["sub_questions"]
    ):
        sub_question_dict["answered"] = False
        sub_question_dict["verified"] = False
        sub_questions_dict[sub_question_nr] = sub_question_dict

    return {
        "decomposed_sub_questions_dict": sub_questions_dict,
        "log_messages": generate_log_message(
            message="deep - decompose",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
