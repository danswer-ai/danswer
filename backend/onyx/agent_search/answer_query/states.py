from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.expanded_retrieval.states import RetrievalResult
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


class SearchAnswerResults(BaseModel):
    question: str
    answer: str
    quality: str
    retrieval_results: list[RetrievalResult]
    documents: Annotated[list[InferenceSection], dedup_inference_sections]


class QACheckOutput(TypedDict, total=False):
    answer_quality: str


class QAGenerationOutput(TypedDict, total=False):
    answer: str


class AnswerQueryState(
    PrimaryState,
    QACheckOutput,
    QAGenerationOutput,
    total=True,
):
    question: str


class AnswerQueryInput(PrimaryState, total=True):
    question: str


class AnswerQueryOutput(TypedDict):
    answer_results: list[SearchAnswerResults]
