from operator import add
from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


### Models ###


class ExpandedRetrievalResult(BaseModel):
    expanded_query: str
    expanded_retrieval_documents: list[InferenceSection]


### States ###
## Update States


class DocVerificationUpdate(TypedDict):
    verified_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRerankingUpdate(TypedDict):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRetrievalUpdate(TypedDict):
    expanded_retrieval_results: Annotated[list[ExpandedRetrievalResult], add]
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]


## Graph State


class ExpandedRetrievalState(
    PrimaryState,
    DocRetrievalUpdate,
    DocVerificationUpdate,
    DocRerankingUpdate,
):
    question: str


## Graph Output State


class ExpandedRetrievalOutput(TypedDict):
    expanded_retrieval_results: list[ExpandedRetrievalResult]
    documents: Annotated[list[InferenceSection], dedup_inference_sections]


## Input States


class ExpandedRetrievalInput(PrimaryState):
    question: str


class RetrievalInput(PrimaryState):
    query_to_retrieve: str
