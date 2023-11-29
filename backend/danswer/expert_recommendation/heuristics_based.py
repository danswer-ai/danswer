from collections import defaultdict

from danswer.indexing.models import InferenceChunk
from danswer.utils.text_processing import is_valid_email

# What is the minimum cumulative score for a user to be considered an Expert
# If a set of 50 results is shown, user needs a cumulative doc score of 2.5 to be an expert
_EXPERT_SCORE_RATIO = 2.5 / 50
# How much should a score be discounted if the user is not the primary owner
_SECONDARY_OWNER_DISCOUNT = 0.5


def extract_experts(
    chunks: list[InferenceChunk], score_ratio: float = _EXPERT_SCORE_RATIO
) -> list[str]:
    target_score = score_ratio * len(chunks)

    expert_scores: dict[str, float] = defaultdict(float)

    for chunk in chunks:
        if chunk.primary_owners:
            for p_owner in chunk.primary_owners:
                if chunk.score:
                    expert_scores[p_owner] += chunk.score

        if chunk.secondary_owners:
            for s_owner in chunk.secondary_owners:
                if chunk.score:
                    expert_scores[s_owner] += _SECONDARY_OWNER_DISCOUNT * chunk.score

    return [
        owner
        for owner, score in expert_scores.items()
        if score >= target_score and is_valid_email(owner)
    ]
