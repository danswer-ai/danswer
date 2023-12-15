import abc
from collections.abc import Callable

from danswer.chat.models import AnswerQuestionReturn
from danswer.chat.models import AnswerQuestionStreamReturn
from danswer.chat.models import LLMMetricsContainer
from danswer.indexing.models import InferenceChunk


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
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionStreamReturn:
        raise NotImplementedError
