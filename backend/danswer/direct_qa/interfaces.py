import abc
from collections.abc import Generator
from typing import Any

from danswer.chunking.models import InferenceChunk


DanswerAnswer = str | None
# Maps a quote string to a dictionary of other info for the quote such as the blurb, DocumentSource etc.
DanswerQuote = dict[str, dict[str, str | int | None]] | None


class QAModel:
    @abc.abstractmethod
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> tuple[DanswerAnswer, DanswerQuote]:
        raise NotImplementedError

    @abc.abstractmethod
    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> Generator[dict[str, Any] | None, None, None]:
        raise NotImplementedError
