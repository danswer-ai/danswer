import abc
import re
from collections.abc import Callable
from collections.abc import Iterator
from copy import copy

import tiktoken
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage

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
from danswer.llm.utils import get_default_llm_tokenizer
from danswer.prompts.constants import CODE_BLOCK_PAT
from danswer.prompts.direct_qa_prompts import COT_PROMPT
from danswer.prompts.direct_qa_prompts import JSON_PROMPT
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
        raise NotImplementedError

    @abc.abstractmethod
    def process_llm_output(
        self, model_output: str, context_chunks: list[InferenceChunk]
    ) -> tuple[DanswerAnswer, DanswerQuotes]:
        raise NotImplementedError

    @abc.abstractmethod
    def process_llm_token_stream(
        self, tokens: Iterator[str], context_chunks: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        raise NotImplementedError


class JsonQAHandler(abc.ABC):
    @abc.abstractmethod
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        raise NotImplementedError

    @property
    def is_json_output(self) -> bool:
        return True

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


class SingleMessageQAHandler(JsonQAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        context_docs_str = "\n".join(
            f"\n{CODE_BLOCK_PAT.format(c.content)}\n" for c in context_chunks
        )

        single_message = JSON_PROMPT.format(
            context_docs_str=context_docs_str, user_query=query
        )

        prompt: list[BaseMessage] = [HumanMessage(content=single_message)]
        return prompt


class SingleMessageScratchpadHandler(QAHandler):
    @property
    def is_json_output(self) -> bool:
        # Even though the full LLM output isn't a valid json
        # only the valid json portion is kept and passed along
        # therefore it should be treated as a json output
        return True

    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        context_docs_str = "\n".join(
            f"\n{CODE_BLOCK_PAT.format(c.content)}\n" for c in context_chunks
        )

        single_message = COT_PROMPT.format(
            context_docs_str=context_docs_str, user_query=query
        )

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


"""
class SimpleChatQAHandler(QAHandler):
    @property
    def is_json_output(self) -> bool:
        return False

    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        return str_prompt_to_langchain_prompt(
            WeakModelFreeformProcessor.fill_prompt(
                question=query,
                chunks=context_chunks,
                include_metadata=False,
            )
        )
"""


def _tiktoken_trim_chunks(
    chunks: list[InferenceChunk], max_chunk_toks: int = 512
) -> list[InferenceChunk]:
    """Edit chunks that have too high token count. Generally due to parsing issues or
    characters from another language that are 1 char = 1 token
    Trimming by tokens leads to information loss but currently no better way of handling
    NOTE: currently gpt-3.5  / gpt-4 tokenizer across all LLMs currently
    TODO: make "chunk modification" its own step in the pipeline
    """
    encoder = tiktoken.get_encoding("cl100k_base")
    new_chunks = copy(chunks)
    for ind, chunk in enumerate(new_chunks):
        tokens = encoder.encode(chunk.content)
        if len(tokens) > max_chunk_toks:
            new_chunk = copy(chunk)
            new_chunk.content = encoder.decode(tokens[:max_chunk_toks])
            new_chunks[ind] = new_chunk
    return new_chunks


class QABlock(QAModel):
    def __init__(self, llm: LLM, qa_handler: QAHandler) -> None:
        self._llm = llm
        self._qa_handler = qa_handler

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
        trimmed_context_docs = _tiktoken_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        model_out = self._llm.invoke(prompt)

        if metrics_callback is not None:
            prompt_tokens = sum(
                [
                    check_number_of_tokens(
                        text=p.content, encode_fn=get_default_llm_tokenizer()
                    )
                    for p in prompt
                ]
            )

            response_tokens = check_number_of_tokens(
                text=model_out, encode_fn=get_default_llm_tokenizer()
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
        trimmed_context_docs = _tiktoken_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        tokens = self._llm.stream(prompt)
        yield from self._qa_handler.process_llm_token_stream(
            tokens, trimmed_context_docs
        )
