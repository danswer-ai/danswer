from operator import add
from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalResult
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


### Models ###


class SearchAnswerResults(BaseModel):
    question: str
    answer: str
    quality: str
    expanded_retrieval_results: list[ExpandedRetrievalResult]
    documents: list[InferenceSection]


### States ###

## Update States


class QACheckUpdate(TypedDict):
    answer_quality: str


class QAGenerationUpdate(TypedDict):
    answer: str


class RetrievalIngestionUpdate(TypedDict):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
    expanded_retrieval_results: list[ExpandedRetrievalResult]


## Graph State


class AnswerQuestionState(
    PrimaryState,
    QAGenerationUpdate,
    QACheckUpdate,
    RetrievalIngestionUpdate,
    total=True,
):
    question: str


## Input State


class AnswerQuestionInput(PrimaryState):
    question: str


## Graph Output State


class AnswerQuestionOutput(TypedDict):
    """
    This is a list of results even though each call of this subgraph only returns one result.
    This is because if we parallelize the answer query subgraph, there will be multiple
      results in a list so the add operator is used to add them together.
    """

    answer_results: Annotated[list[SearchAnswerResults], add]
