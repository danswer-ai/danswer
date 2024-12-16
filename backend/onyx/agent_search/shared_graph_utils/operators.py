from onyx.chat.prune_and_merge import _merge_sections
from onyx.context.search.models import InferenceSection


def dedup_inference_sections(
    list1: list[InferenceSection], list2: list[InferenceSection]
) -> list[InferenceSection]:
    deduped = _merge_sections(list1 + list2)
    return deduped
