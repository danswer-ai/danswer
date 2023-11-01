import abc
from collections.abc import Callable
from collections.abc import Iterator

from pydantic import BaseModel

from danswer.direct_qa.models import LLMMetricsContainer
from danswer.indexing.models import InferenceChunk


class StreamingError(BaseModel):
    error: str


class DanswerAnswer(BaseModel):
    answer: str | None


class DanswerChatModelOut(BaseModel):
    model_raw: str
    action: str
    action_input: str


class DanswerAnswerPiece(BaseModel):
    """A small piece of a complete answer. Used for streaming back answers."""

    answer_piece: str | None  # if None, specifies the end of an Answer


class DanswerQuote(BaseModel):
    # This is during inference so everything is a string by this point
    quote: str
    document_id: str
    link: str | None
    source_type: str
    semantic_identifier: str
    blurb: str


class DanswerQuotes(BaseModel):
    quotes: list[DanswerQuote]


# Final int is for number of output tokens
AnswerQuestionReturn = tuple[DanswerAnswer, DanswerQuotes]
AnswerQuestionStreamReturn = Iterator[DanswerAnswerPiece | DanswerQuotes]


class QAModel:
    @property
    def requires_api_key(self) -> bool:
        """Is this model protected by security features
        Does it need an api key to access the model for inference"""
        # TODO, this should be false for custom request model and gpt4all
        return True

    def warm_up_model(self) -> None:
        """This is called during server start up to load the models into memory
        pass if model is accessed via API"""

    @abc.abstractmethod
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionReturn:
        raise NotImplementedError

    @abc.abstractmethod
    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        raise NotImplementedError
