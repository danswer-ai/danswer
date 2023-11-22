import abc
import re
from collections.abc import Callable
from collections.abc import Iterator

from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage

from danswer.configs.app_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.indexing.models import InferenceChunk
from danswer.llm.interfaces import LLM
from danswer.llm.utils import check_number_of_tokens
from danswer.llm.utils import get_default_llm_token_encode
from danswer.llm.utils import tokenizer_trim_chunks
from danswer.prompts.constants import CODE_BLOCK_PAT
from danswer.prompts.direct_qa_prompts import COT_PROMPT
from danswer.prompts.direct_qa_prompts import JSON_PROMPT
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.direct_qa_prompts import WEAK_LLM_PROMPT
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_up_code_blocks
from danswer.utils.text_processing import escape_newlines

logger = setup_logger()


class QAHandler(abc.ABC):
    @abc.abstractmethod
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        raise NotImplementedError

    @property
    @abc.abstractmethod
    def is_json_output(self) -> bool:
        """Does the model output a valid json with answer and quotes keys? Most flows with a
        capable model should output a json. This hints to the model that the output is used
        with a downstream system rather than freeform creative output. Most models should be
        finetuned to recognize this."""
        raise NotImplementedError

    def process_llm_output(
        self, model_output: str, context_chunks: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, DanswerQuotes]:
        return process_answer(
            model_output, context_chunks, is_json_prompt=self.is_json_output
        )

    def process_llm_token_stream(
        self, tokens: Iterator[str], context_chunks: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_chunks,
            is_json_prompt=self.is_json_output,
        )


# Maps connector enum string to a more natural language representation for the LLM
# If not on the list, uses the original but slightly cleaned up, see below
CONNECTOR_NAME_MAP = {
    "web": "Website",
    "requesttracker": "Request Tracker",
    "github": "GitHub",
    "file": "File Upload",
}


def clean_up_source(source_str: str) -> str:
    if source_str in CONNECTOR_NAME_MAP:
        return CONNECTOR_NAME_MAP[source_str]
    return source_str.replace("_", " ").title()


def build_context_str(
    context_chunks: list[InferenceChunk],
    include_metadata: bool = True,
) -> str:
    context = ""
    for chunk in context_chunks:
        if include_metadata:
            context += f"NEW DOCUMENT: {chunk.semantic_identifier}\n"
            context += f"Source: {clean_up_source(chunk.source_type)}\n"
            if chunk.updated_at:
                update_str = chunk.updated_at.strftime("%B %d, %Y %H:%M")
                context += f"Updated: {update_str}\n"
        context += f"{CODE_BLOCK_PAT.format(chunk.content.strip())}\n\n\n"
    return context.strip()


class WeakLLMQAHandler(QAHandler):
    """Since Danswer supports a variety of LLMs, this less demanding prompt is provided
    as an option to use with weaker LLMs such as small version, low float precision, quantized,
    or distilled models. It only uses one context document and has very weak requirements of
    output format.
    """

    @property
    def is_json_output(self) -> bool:
        return False

    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        message = WEAK_LLM_PROMPT.format(single_reference_doc=context_chunks[0].content)

        return [HumanMessage(content=message)]


class SingleMessageQAHandler(QAHandler):
    @property
    def is_json_output(self) -> bool:
        return True

    def build_prompt(
        self,
        query: str,
        context_chunks: list[InferenceChunk],
        use_language_hint: bool = bool(MULTILINGUAL_QUERY_EXPANSION),
    ) -> list[BaseMessage]:
        context_docs_str = build_context_str(context_chunks)

        single_message = JSON_PROMPT.format(
            context_docs_str=context_docs_str,
            user_query=query,
            language_hint_or_none=LANGUAGE_HINT if use_language_hint else "",
        ).strip()

        prompt: list[BaseMessage] = [HumanMessage(content=single_message)]
        return prompt


class SingleMessageScratchpadHandler(QAHandler):
    @property
    def is_json_output(self) -> bool:
        # Even though the full LLM output isn't a valid json
        # only the valid json portion is kept and passed along
        # therefore it is treated as a json output
        return True

    def build_prompt(
        self,
        query: str,
        context_chunks: list[InferenceChunk],
        use_language_hint: bool = bool(MULTILINGUAL_QUERY_EXPANSION),
    ) -> list[BaseMessage]:
        context_docs_str = build_context_str(context_chunks)

        single_message = COT_PROMPT.format(
            context_docs_str=context_docs_str,
            user_query=query,
            language_hint_or_none=LANGUAGE_HINT if use_language_hint else "",
        ).strip()

        prompt: list[BaseMessage] = [HumanMessage(content=single_message)]
        return prompt

    def process_llm_output(
        self, model_output: str, context_chunks: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, DanswerQuotes]:
        logger.debug(model_output)

        model_clean = clean_up_code_blocks(model_output)

        match = re.search(r'{\s*"answer":', model_clean)
        if not match:
            return DanswerAnswer(answer=None), DanswerQuotes(quotes=[])

        final_json = escape_newlines(model_clean[match.start() :])

        return process_answer(
            final_json, context_chunks, is_json_prompt=self.is_json_output
        )

    def process_llm_token_stream(
        self, tokens: Iterator[str], context_chunks: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        # Can be supported but the parsing is more involved, not handling until needed
        raise ValueError(
            "This Scratchpad approach is not suitable for real time uses like streaming"
        )


class QABlock(QAModel):
    def __init__(self, llm: LLM, qa_handler: QAHandler) -> None:
        self._llm = llm
        self._qa_handler = qa_handler

    @property
    def requires_api_key(self) -> bool:
        return self._llm.requires_api_key

    def warm_up_model(self) -> None:
        """This is called during server start up to load the models into memory
        in case the chosen LLM is not accessed via API"""
        if self._llm.requires_warm_up:
            logger.info("Warming up LLM with a first inference")
            self._llm.invoke("Ignore this!")

    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionReturn:
        trimmed_context_docs = tokenizer_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        model_out = self._llm.invoke(prompt)

        if metrics_callback is not None:
            prompt_tokens = sum(
                [
                    check_number_of_tokens(
                        text=p.content, encode_fn=get_default_llm_token_encode()
                    )
                    for p in prompt
                ]
            )

            response_tokens = check_number_of_tokens(
                text=model_out, encode_fn=get_default_llm_token_encode()
            )

            metrics_callback(
                LLMMetricsContainer(
                    prompt_tokens=prompt_tokens, response_tokens=response_tokens
                )
            )

        return self._qa_handler.process_llm_output(model_out, trimmed_context_docs)

    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        trimmed_context_docs = tokenizer_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        tokens = self._llm.stream(prompt)
        yield from self._qa_handler.process_llm_token_stream(
            tokens, trimmed_context_docs
        )
