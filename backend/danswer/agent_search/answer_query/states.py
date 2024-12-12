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


class QACheckOutput(TypedDict, total=False):
    answer_quality: bool


class QAGenerationOutput(TypedDict, total=False):
    answer: str


class ExpandedRetrievalOutput(TypedDict):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]


class AnswerQueryState(
    PrimaryState,
    QACheckOutput,
    QAGenerationOutput,
    ExpandedRetrievalOutput,
    total=True,
):
    query_to_answer: str


class AnswerQueryInput(PrimaryState, total=True):
    query_to_answer: str


class AnswerQueryOutput(TypedDict):
    documents: Annotated[list[InferenceSection], dedup_inference_sections]
