import abc
from typing import Any

from danswer.chunking.models import InferenceChunk


class QAModel:
    @abc.abstractmethod
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
        raise NotImplementedError

    @abc.abstractmethod
    def stream_answer(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> Any:
        raise NotImplementedError
