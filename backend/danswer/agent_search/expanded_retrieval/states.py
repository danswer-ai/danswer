from typing import Annotated
from typing import TypedDict

from danswer.agent_search.primary_state import PrimaryState
from danswer.context.search.models import InferenceSection
from danswer.llm.answering.prune_and_merge import _merge_sections


def dedup_inference_sections(
    list1: list[InferenceSection], list2: list[InferenceSection]
) -> list[InferenceSection]:
    deduped = _merge_sections(list1 + list2)
    return deduped


class DocRetrievalOutput(TypedDict, total=False):
    retrieved_documents: Annotated[list[InferenceSection], dedup_inference_sections]


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
    query_to_expand: str


class ExpandedRetrievalInput(PrimaryState, total=True):
    query_to_expand: str


class ExpandedRetrievalOutput(TypedDict):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
