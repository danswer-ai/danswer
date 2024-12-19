from collections.abc import Hashable

from langgraph.types import Send

from onyx.agent_search.answer_question.states import AnswerQuestionInput
from onyx.agent_search.core_state import extract_primary_fields
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput


def send_to_expanded_retrieval(state: AnswerQuestionInput) -> Send | Hashable:
    return Send(
        "decomped_expanded_retrieval",
        ExpandedRetrievalInput(
            **extract_primary_fields(state),
            question=state["question"],
        ),
    )
