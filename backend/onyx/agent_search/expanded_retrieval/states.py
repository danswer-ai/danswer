from operator import add
from typing import Annotated
from typing import Any
from typing import TypedDict

from onyx.agent_search.core_state import PrimaryState
from onyx.agent_search.shared_graph_utils.operators import dedup_inference_sections
from onyx.context.search.models import InferenceSection


class DocRetrievalOutput(TypedDict, total=False):
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]
    retrieval_stats: Annotated[list[dict[str, Any]], add]


class DocVerificationOutput(TypedDict, total=False):
    verified_documents: Annotated[list[InferenceSection], dedup_inference_sections]


class DocRerankingOutput(TypedDict, total=False):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
    ranking_scores: Annotated[list[dict[str, float]], add]
    original_question_documents: Annotated[
        list[InferenceSection], dedup_inference_sections
    ]
    original_question_ranking_scores: Annotated[list[dict[str, float]], add]


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


class ExpandedRetrievalOutput(DocRerankingOutput):
    pass
