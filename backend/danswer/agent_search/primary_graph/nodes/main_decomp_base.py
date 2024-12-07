from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.prompts import INITIAL_DECOMPOSITION_PROMPT
from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import clean_and_parse_list_string
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def main_decomp_base(state: QAState) -> dict[str, Any]:
    """
    Perform an initial question decomposition, incl. one search term

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with initial decomposition
    """

    print("---INITIAL DECOMP---")
    node_start_time = datetime.now()

    question = state["original_question"]

    msg = [
        HumanMessage(
            content=INITIAL_DECOMPOSITION_PROMPT.format(question=question),
        )
    ]

    # Get the rewritten queries in a defined format
    model = state["fast_llm"]
    response = model.invoke(msg)

    content = response.pretty_repr()
    list_of_subquestions = clean_and_parse_list_string(content)

    decomp_list = []

    for sub_question_nr, sub_question in enumerate(list_of_subquestions):
        sub_question_str = sub_question["sub_question"].strip()
        # temporarily
        sub_question_search_queries = [sub_question["search_term"]]

        decomp_list.append(
            {
                "sub_question_str": sub_question_str,
                "sub_question_search_queries": sub_question_search_queries,
                "sub_question_nr": sub_question_nr,
            }
        )

    return {
        "initial_sub_questions": decomp_list,
        "sub_query_start_time": node_start_time,
        "log_messages": generate_log_message(
            message="core - initial decomp",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
