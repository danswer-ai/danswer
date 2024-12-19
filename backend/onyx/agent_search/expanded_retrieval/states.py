from operator import add
from typing import Annotated
from typing import Any
from typing import TypedDict

from pydantic import BaseModel

from onyx.agent_search.core_state import CoreState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


### Models ###


class QueryResult(BaseModel):
    query: str
    documents_for_query: list[InferenceSection]
    chunk_ids: list[str]
    stats: dict[str, Any]


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


## Graph Input State


class ExpandedRetrievalInput(CoreState):
    question: str


## Graph State


class ExpandedRetrievalState(
    # This includes the core state
    ExpandedRetrievalInput,
    DocRetrievalUpdate,
    DocVerificationUpdate,
    DocRerankingUpdate,
    QueryExpansionUpdate,
):
    pass


## Graph Output State


class ExpandedRetrievalOutput(TypedDict):
    expanded_retrieval_result: ExpandedRetrievalResult


## Conditional Input States


class DocVerificationInput(CoreState):
    doc_to_verify: InferenceSection


class RetrievalInput(CoreState):
    query_to_retrieve: str
