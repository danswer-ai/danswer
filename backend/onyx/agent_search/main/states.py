from operator import add
from typing import Annotated
from typing import TypedDict

from onyx.agent_search.answer_query.states import SearchAnswerResults
from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


class BaseDecompOutput(TypedDict, total=False):
    initial_decomp_questions: list[str]


class InitialAnswerOutput(TypedDict, total=False):
    initial_answer: str


class MainState(
    PrimaryState,
    BaseDecompOutput,
    InitialAnswerOutput,
    total=True,
):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
    decomp_answer_results: Annotated[list[SearchAnswerResults], add]


class MainInput(PrimaryState, total=True):
    pass


class MainOutput(TypedDict):
    """
    This is not used because defining the output only matters for filtering the output of
      a .invoke() call but we are streaming so we just yield the entire state.
    """
