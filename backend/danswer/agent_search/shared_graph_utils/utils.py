from collections.abc import Sequence

from danswer.chat.models import DanswerContext


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text to single spaces and strip leading/trailing whitespace."""
    import re

    return re.sub(r"\s+", " ", text.strip())


# Post-processing
def format_docs(docs: Sequence[DanswerContext]) -> str:
    return "\n\n".join(doc.content for doc in docs)
