from collections.abc import Hashable

from langgraph.types import Send

from onyx.agent_search.answer_query.states import AnswerQueryInput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput


def send_to_expanded_retrieval(state: AnswerQueryInput) -> Send | Hashable:
    return Send(
        "expanded_retrieval",
        ExpandedRetrievalInput(
            **state,
            starting_query=state["starting_query"],
        ),
    )
