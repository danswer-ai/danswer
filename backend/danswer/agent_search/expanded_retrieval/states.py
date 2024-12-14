from typing import Annotated
from typing import TypedDict

from danswer.agent_search.core_state import PrimaryState
from danswer.agent_search.shared_graph_utils.operators import dedup_inference_sections
from danswer.context.search.models import InferenceSection


class DocRetrievalOutput(TypedDict, total=False):
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]
    query_to_answer: str


class DocVerificationInput(TypedDict, total=True):
    query_to_answer: str
    doc_to_verify: InferenceSection


class DocVerificationOutput(TypedDict, total=False):
    verified_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRerankingOutput(TypedDict, total=False):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class ExpandedRetrievalState(
    PrimaryState,
    DocRetrievalOutput,
    DocVerificationOutput,
    DocRerankingOutput,
    total=True,
):
    query_to_answer: str


class ExpandedRetrievalInput(PrimaryState, total=True):
    query_to_answer: str


class ExpandedRetrievalOutput(TypedDict):
    reranked_documents: Annotated[list[InferenceSection], dedup_inference_sections]
