from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.expanded_retrieval.states import DocRerankingOutput
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


class SearchAnswerResults(BaseModel):
    query: str
    answer: str
    quality: str
    documents: Annotated[list[InferenceSection], dedup_inference_sections]


class QACheckOutput(TypedDict, total=False):
    answer_quality: str


class QAGenerationOutput(TypedDict, total=False):
    answer: str


class ExpandedRetrievalOutput(TypedDict):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class AnswerQueryState(
    PrimaryState,
    QACheckOutput,
    QAGenerationOutput,
    ExpandedRetrievalOutput,
    DocRerankingOutput,
    total=True,
):
    query_to_answer: str


class AnswerQueryInput(PrimaryState, total=True):
    query_to_answer: str


class AnswerQueryOutput(TypedDict):
    decomp_answer_results: list[SearchAnswerResults]
