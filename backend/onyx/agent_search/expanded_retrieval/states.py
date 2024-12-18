from operator import add
from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


class ExpandedRetrievalResult(BaseModel):
    expanded_query: str
    expanded_retrieval_documents: Annotated[
        list[InferenceSection], dedup_inference_sections
    ]


class DocRetrievalOutput(TypedDict, total=False):
    expanded_retrieval_results: Annotated[list[ExpandedRetrievalResult], add]
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocVerificationOutput(TypedDict, total=False):
    verified_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRerankingOutput(TypedDict, total=False):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class ExpandedRetrievalOutput(TypedDict):
    expanded_retrieval_results: list[ExpandedRetrievalResult]
    documents: Annotated[list[InferenceSection], dedup_inference_sections]


class ExpandedRetrievalState(
    PrimaryState,
    DocRetrievalOutput,
    DocVerificationOutput,
    DocRerankingOutput,
    total=True,
):
    starting_query: str


class ExpandedRetrievalInput(PrimaryState, total=True):
    starting_query: str
