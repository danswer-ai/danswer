import re
from collections.abc import Callable

from transformers import pipeline  # type:ignore
from transformers import QuestionAnsweringPipeline  # type:ignore

from danswer.chunking.models import InferenceChunk
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()

TRANSFORMER_DEFAULT_MAX_CONTEXT = 512

_TRANSFORMER_MODEL: QuestionAnsweringPipeline | None = None


def get_default_transformer_model(
    model_version: str = GEN_AI_MODEL_VERSION,
    max_context: int = TRANSFORMER_DEFAULT_MAX_CONTEXT,
) -> QuestionAnsweringPipeline:
    global _TRANSFORMER_MODEL
    if _TRANSFORMER_MODEL is None:
        _TRANSFORMER_MODEL = pipeline(
            "question-answering", model=model_version, max_seq_len=max_context
        )

    return _TRANSFORMER_MODEL


def find_extended_answer(answer: str, context: str) -> str:
    """Try to extend the answer by matching across the context text and extending before
    and after the quote to some termination character"""
    result = re.search(
        r"(^|\n\r?|\.)(?P<content>[^\n]{{0,250}}{}[^\n]{{0,250}})(\.|$|\n\r?)".format(
            re.escape(answer)
        ),
        context,
        flags=re.MULTILINE | re.DOTALL,
    )
    if result:
        return result.group("content")

    return answer


class TransformerQA(QAModel):
    @staticmethod
    def _answer_one_chunk(
        query: str,
        chunk: InferenceChunk,
        max_context_len: int = TRANSFORMER_DEFAULT_MAX_CONTEXT,
        max_cutoff: float = 0.9,
        min_cutoff: float = 0.5,
    ) -> tuple[str | None, DanswerQuote | None]:
        """Because this type of QA model only takes 1 chunk of context with a fairly small token limit
        We have to iterate the checks and check if the answer is found in any of the chunks.
        This type of approach does not allow for interpolating answers across chunks
        """
        model = get_default_transformer_model()
        model_out = model(question=query, context=chunk.content, max_answer_len=128)

        answer = model_out.get("answer")
        confidence = model_out.get("score")

        if answer is None:
            return None, None

        logger.info(f"Transformer Answer: {answer}")
        logger.debug(f"Transformer Confidence: {confidence}")

        # Model tends to be overconfident on short chunks
        # so min score required increases as chunk size decreases
        # If it's at least 0.9, then it's good enough regardless
        # Default minimum of 0.5 required
        score_cutoff = max(
            min(max_cutoff, 1 - len(chunk.content) / max_context_len), min_cutoff
        )
        if confidence < score_cutoff:
            return None, None

        extended_answer = find_extended_answer(answer, chunk.content)

        danswer_quote = DanswerQuote(
            quote=answer,
            document_id=chunk.document_id,
            link=chunk.source_links[0] if chunk.source_links else None,
            source_type=chunk.source_type,
            semantic_identifier=chunk.semantic_identifier,
            blurb=chunk.blurb,
        )

        return extended_answer, danswer_quote

    def warm_up_model(self) -> None:
        get_default_transformer_model()

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,  # Unused
    ) -> AnswerQuestionReturn:
        danswer_quotes: list[DanswerQuote] = []
        d_answers: list[str] = []
        for chunk in context_docs:
            answer, quote = self._answer_one_chunk(query, chunk)
            if answer is not None and quote is not None:
                d_answers.append(answer)
                danswer_quotes.append(quote)

        answers_list = [
            f"Answer {ind}: {answer.strip()}"
            for ind, answer in enumerate(d_answers, start=1)
        ]
        combined_answer = "\n".join(answers_list)
        return DanswerAnswer(answer=combined_answer), DanswerQuotes(
            quotes=danswer_quotes
        )

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        quotes: list[DanswerQuote] = []
        answers: list[str] = []
        for chunk in context_docs:
            answer, quote = self._answer_one_chunk(query, chunk)
            if answer is not None and quote is not None:
                answers.append(answer)
                quotes.append(quote)

        # Delay the output of the answers so there isn't long gap between first answer and quotes
        answer_count = 1
        for answer in answers:
            if answer_count == 1:
                yield DanswerAnswerPiece(answer_piece="Source 1: ")
            else:
                yield DanswerAnswerPiece(answer_piece=f"\nSource {answer_count}: ")
            answer_count += 1
            for char in answer.strip():
                yield DanswerAnswerPiece(answer_piece=char)

        # signal end of answer
        yield DanswerAnswerPiece(answer_piece=None)

        yield DanswerQuotes(quotes=quotes)
