from langchain_core.messages import HumanMessage

from onyx.agent_search.main.states import BaseDecompUpdate
from onyx.agent_search.main.states import MainState
from onyx.agent_search.shared_graph_utils.prompts import INITIAL_DECOMPOSITION_PROMPT
from onyx.agent_search.shared_graph_utils.utils import clean_and_parse_list_string


def main_decomp_base(state: MainState) -> BaseDecompUpdate:
    question = state["search_request"].query

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

    decomp_list: list[str] = [
        sub_question["sub_question"].strip() for sub_question in list_of_subquestions
    ]

    return BaseDecompUpdate(
        initial_decomp_questions=decomp_list,
    )
