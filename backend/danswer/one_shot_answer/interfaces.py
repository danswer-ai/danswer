import abc
from collections.abc import Callable

from danswer.chat.models import AnswerQuestionStreamReturn
from danswer.chat.models import LLMMetricsContainer
from danswer.indexing.models import InferenceChunk


class QAModel:
    @abc.abstractmethod
    def build_prompt(
        self,
        query: str,
        history_str: str,
        context_chunks: list[InferenceChunk],
    ) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def answer_question_stream(
        self,
        prompt: str,
        llm_context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionStreamReturn:
        raise NotImplementedError
