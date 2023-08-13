import re
from collections.abc import Generator
from typing import Any
from typing import Optional
from typing import Union

from transformers import pipeline  # type:ignore
from transformers import QuestionAnsweringPipeline  # type:ignore

from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import BLURB
from danswer.configs.constants import DOCUMENT_ID
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINK
from danswer.configs.constants import SOURCE_TYPE
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import QAModel
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

# Use a pipeline as a high-level helper

logger = setup_logger()

_TRANSFORMER_MODEL = None  # type: Optional[QuestionAnsweringPipeline]


def get_default_transformer_model(
    model_version: str = GEN_AI_MODEL_VERSION,
) -> QuestionAnsweringPipeline:
    global _TRANSFORMER_MODEL
    if _TRANSFORMER_MODEL is None:
        _TRANSFORMER_MODEL = pipeline("question-answering", model=model_version)

    return _TRANSFORMER_MODEL


def strip_context_document(document) -> str:
    return re.sub(r"[\n\r\s]+", " ", document)


def find_extended_answer(answer, context) -> str:
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
    @log_function_time()
    def answer_question(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
        collected_quotes = {}
        answer_str = ""
        answer_number = 1
        for chunk in context_docs:
            answer, quotes_dict = self._answer_one_chunk(query, chunk)
            if answer is not None:
                answer_str += f"({answer_number}) {answer}\n"
                answer_number += 1
            if quotes_dict is not None:
                collected_quotes.update(quotes_dict)

        return answer_str, collected_quotes

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> Generator[dict[str, Any] | None, None, None]:
        yield {
            "answer_data": " "
        }  # HACK: yield something or semantic search results won't show before the first result
        collected_quotes = {}
        previous_answers = []
        answer_number = 1
        for chunk in context_docs:
            answer, quotes_dict = self._answer_one_chunk(query, chunk)
            if answer is not None and answer not in previous_answers:
                previous_answers.append(answer)
                yield {"answer_data": f"({answer_number}) {answer}\n"}
                answer_number += 1
            if quotes_dict is not None:
                collected_quotes.update(quotes_dict)
                # HACK: for some reason we have to resent all quotes every time
                yield collected_quotes

    @staticmethod
    def _answer_one_chunk(
        query: str, chunk: InferenceChunk
    ) -> tuple[str | None, dict[str, dict[str, str | int | None]] | None]:
        quotes_dict: dict[str, dict[str, Union[str, int, None]]] = {}
        logger.debug(f"LLM question: {query}")

        model = get_default_transformer_model()
        answer = model(question=query, context=chunk.content, max_answer_len=128)

        logger.info(f"Answer: {answer}")

        if not answer.get("answer", ""):
            # empty answer
            return None, None

        min_score = max(
            1.0 - len(chunk.content) / 512, 0.01
        )  # models are overconfident on short chunks
        if answer.get("score", 0) < min_score:
            # empty answer
            return None, None

        answer_str = answer["answer"]  # type: str
        extended_answer_str = find_extended_answer(answer_str, chunk.content)

        quotes_dict[answer_str] = {
            DOCUMENT_ID: chunk.document_id,
            SOURCE_LINK: chunk.source_links[0] if chunk.source_links else None,
            SOURCE_TYPE: chunk.source_type,
            SEMANTIC_IDENTIFIER: chunk.semantic_identifier,
            BLURB: chunk.blurb,
        }

        return extended_answer_str, quotes_dict
