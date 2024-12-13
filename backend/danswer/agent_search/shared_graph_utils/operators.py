from danswer.context.search.models import InferenceSection
from danswer.llm.answering.prune_and_merge import _merge_sections


def dedup_inference_sections(
    list1: list[InferenceSection], list2: list[InferenceSection]
) -> list[InferenceSection]:
    deduped = _merge_sections(list1 + list2)
    return deduped
