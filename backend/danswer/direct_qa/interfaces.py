import abc
from typing import *

from danswer.chunking.models import InferenceChunk


class QAModel:
    @abc.abstractmethod
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
        raise NotImplementedError
