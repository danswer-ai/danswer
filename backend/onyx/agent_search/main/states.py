from operator import add
from typing import Annotated
from typing import TypedDict

from onyx.agent_search.answer_question.states import QuestionAnswerResults
from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalResult
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection

### States ###

## Update States


class BaseDecompUpdate(TypedDict):
    initial_decomp_questions: list[str]


class InitialAnswerUpdate(TypedDict):
    initial_answer: str


class DecompAnswersUpdate(TypedDict):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
    decomp_answer_results: Annotated[list[QuestionAnswerResults], add]


class ExpandedRetrievalUpdate(TypedDict):
    all_original_question_documents: Annotated[
        list[InferenceSection], dedup_inference_sections
    ]
    original_question_retrieval_results: list[ExpandedRetrievalResult]


## Graph State


class MainState(
    PrimaryState,
    BaseDecompUpdate,
    InitialAnswerUpdate,
    DecompAnswersUpdate,
    ExpandedRetrievalUpdate,
):
    pass


## Input States


class MainInput(PrimaryState):
    pass


## Graph Output State


class MainOutput(TypedDict):
    """
    This is not used because defining the output only matters for filtering the output of
      a .invoke() call but we are streaming so we just yield the entire state.
    """
