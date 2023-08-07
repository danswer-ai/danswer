import abc
from collections.abc import Generator
from dataclasses import dataclass
from typing import Any

from danswer.chunking.models import InferenceChunk


@dataclass
class DanswerAnswer:
    answer: str | None


@dataclass
class DanswerQuote:
    # This is during inference so everything is a string by this point
    quote: str
    document_id: str
    link: str | None
    source_type: str
    semantic_identifier: str
    blurb: str


class QAModel:
    @property
    def requires_api_key(self) -> bool:
        """Is this model protected by security features
        Does it need an api key to access the model for inference"""
        return True

    def warm_up_model(self) -> None:
        """This is called during server start up to load the models into memory
        pass if model is accessed via API"""
        pass

    @abc.abstractmethod
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> tuple[DanswerAnswer, list[DanswerQuote]]:
        raise NotImplementedError

    @abc.abstractmethod
    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> Generator[dict[str, Any] | None, None, None]:
        raise NotImplementedError
