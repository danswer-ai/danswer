import abc
from collections.abc import Callable
from collections.abc import Generator
from dataclasses import dataclass

from danswer.chunking.models import InferenceChunk
from danswer.direct_qa.models import LLMMetricsContainer


@dataclass
class DanswerAnswer:
    answer: str | None


@dataclass
class DanswerChatModelOut:
    model_raw: str
    action: str
    action_input: str


@dataclass
class DanswerAnswerPiece:
    """A small piece of a complete answer. Used for streaming back answers."""

    answer_piece: str | None  # if None, specifies the end of an Answer


@dataclass
class DanswerQuote:
    # This is during inference so everything is a string by this point
    quote: str
    document_id: str
    link: str | None
    source_type: str
    semantic_identifier: str
    blurb: str


@dataclass
class DanswerQuotes:
    """A little clunky, but making this into a separate class so that the result from
    `answer_question_stream` is always a subclass of `dataclass` and can thus use `asdict()`
    """

    quotes: list[DanswerQuote]


# Final int is for number of output tokens
AnswerQuestionReturn = tuple[DanswerAnswer, DanswerQuotes]
AnswerQuestionStreamReturn = Generator[
    DanswerAnswerPiece | DanswerQuotes | None, None, None
]


class QAModel:
    @property
    def requires_api_key(self) -> bool:
        """Is this model protected by security features
        Does it need an api key to access the model for inference"""
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
