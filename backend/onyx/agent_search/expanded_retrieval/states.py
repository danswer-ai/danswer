from operator import add
from typing import Annotated
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


### Models ###


class QueryResult(BaseModel):
    query: str
    documents_for_query: list[InferenceSection]


class ExpandedRetrievalResult(BaseModel):
    expanded_queries_results: list[QueryResult]
    all_documents: list[InferenceSection]


### States ###
## Update States


class DocVerificationUpdate(TypedDict):
    verified_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRerankingUpdate(TypedDict):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class QueryExpansionUpdate(TypedDict):
    expanded_queries: list[str]


class DocRetrievalUpdate(TypedDict):
    expanded_retrieval_results: Annotated[list[QueryResult], add]
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]


## Graph State


class ExpandedRetrievalState(
    PrimaryState,
    DocRetrievalUpdate,
    DocVerificationUpdate,
    DocRerankingUpdate,
    QueryExpansionUpdate,
):
    question: str


## Graph Output State


class ExpandedRetrievalOutput(TypedDict):
    expanded_retrieval_result: ExpandedRetrievalResult


## Input States


class ExpandedRetrievalInput(PrimaryState):
    question: str


class DocVerificationInput(PrimaryState):
    doc_to_verify: InferenceSection


class RetrievalInput(PrimaryState):
    query_to_retrieve: str
