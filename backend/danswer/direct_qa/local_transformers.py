import re
from collections.abc import Generator
from typing import Any

from transformers import pipeline  # type:ignore
from transformers import QuestionAnsweringPipeline  # type:ignore

from danswer.chunking.models import InferenceChunk
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_utils import structure_quotes_for_response
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()

_TRANSFORMER_MODEL: QuestionAnsweringPipeline | None = None


def get_default_transformer_model(
    model_version: str = GEN_AI_MODEL_VERSION,
) -> QuestionAnsweringPipeline:
    global _TRANSFORMER_MODEL
    if _TRANSFORMER_MODEL is None:
        _TRANSFORMER_MODEL = pipeline("question-answering", model=model_version)

    return _TRANSFORMER_MODEL


def find_extended_answer(answer: str, context: str) -> str:
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
        query: str, chunk: InferenceChunk
    ) -> tuple[str | None, DanswerQuote | None]:
        """Because this type of QA model only takes 1 chunk of context with a fairly small token limit
        We have to iterate the checks and check if the answer is found in any of the chunks.
        If an answer is found with a confidence above a cutoff, then that chunk is the quote
        Limitation: No actual quoted segment from the chunk, the whole chunk becomes the reference
        """
        logger.debug(f"LLM question: {query}")

        model = get_default_transformer_model()
        answer = model(question=query, context=chunk.content, max_answer_len=128)

        logger.info(f"Answer: {answer}")

        if not answer.get("answer", ""):
            return None, None

        min_score = max(
            1.0 - len(chunk.content) / 512, 0.01
        )  # models are overconfident on short chunks
        if answer.get("score", 0) < min_score:
            # empty answer
            return None, None

        short_answer = answer["answer"]
        extended_answer = find_extended_answer(short_answer, chunk.content)

        danswer_quote = DanswerQuote(
            quote=short_answer,
            document_id=chunk.document_id,
            link=chunk.source_links[0] if chunk.source_links else None,
            source_type=chunk.source_type,
            semantic_identifier=chunk.semantic_identifier,
            blurb=chunk.blurb,
        )

        return extended_answer, danswer_quote

    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, list[DanswerQuote]]:
        danswer_quotes: list[DanswerQuote] = []
        combined_answer: str | None = None
        answer_number = 1
        for chunk in context_docs:
            answer, quote = self._answer_one_chunk(query, chunk)
            if answer is not None:
                if combined_answer is None:
                    combined_answer = f"({answer_number}) {answer}\n"
                else:
                    combined_answer += f"({answer_number}) {answer}\n"
                answer_number += 1

                if quote is not None:
                    danswer_quotes.append(quote)

        return DanswerAnswer(answer=combined_answer), danswer_quotes

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        yield {
            "answer_data": " "
        }  # HACK: yield something or semantic search results won't show before the first result
        danswer_quotes: list[DanswerQuote] = []
        previous_answers = []
        answer_number = 1
        for chunk in context_docs:
            answer, quote = self._answer_one_chunk(query, chunk)
            if answer is not None and answer not in previous_answers:
                previous_answers.append(answer)
                yield {"answer_data": f"({answer_number}) {answer}\n"}
                answer_number += 1
            if quote is not None:
                danswer_quotes.append(quote)

        yield structure_quotes_for_response(danswer_quotes)
