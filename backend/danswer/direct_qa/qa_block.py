import abc
import json
from collections.abc import Iterator
from copy import copy

import tiktoken
from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.chunking.models import InferenceChunk
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.qa_prompts import JsonChatProcessor
from danswer.direct_qa.qa_prompts import SAMPLE_JSON_RESPONSE
from danswer.direct_qa.qa_prompts import UNCERTAINTY_PAT
from danswer.direct_qa.qa_prompts import WeakModelFreeformProcessor
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.llm.llm import LLM
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.llm.utils import str_prompt_to_langchain_prompt
from danswer.utils.logger import setup_logger

logger = setup_logger()


class QAHandler(abc.ABC):
    """Evolution of the `PromptProcessor` - handles both building the prompt and
    processing the response. These are neccessarily coupled, since the prompt determines
    the response format (and thus how it should be parsed into an answer + quotes)."""

    @abc.abstractmethod
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        raise NotImplementedError

    @abc.abstractmethod
    def process_response(
        self, tokens: Iterator[str], context_chunks: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        raise NotImplementedError


class JsonChatQAHandler(QAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        return dict_based_prompt_to_langchain_prompt(
            JsonChatProcessor.fill_prompt(
                question=query, chunks=context_chunks, include_metadata=False
            )
        )

    def process_response(
        self,
        tokens: Iterator[str],
        context_chunks: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_chunks,
            is_json_prompt=True,
        )


class SimpleChatQAHandler(QAHandler):
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

    def process_response(
        self,
        tokens: Iterator[str],
        context_chunks: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_chunks,
            is_json_prompt=False,
        )


class JsonChatQAUnshackledHandler(QAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        prompt: list[BaseMessage] = []

        complete_answer_not_found_response = (
            '{"answer": "' + UNCERTAINTY_PAT + '", "quotes": []}'
        )
        prompt.append(
            SystemMessage(
                content=(
                    "Use the following pieces of context to answer the users question. Your response "
                    "should be in JSON format and contain an answer and (optionally) quotes that help support the answer. "
                    "Your responses should be informative, detailed, and consider all possibilities and edge cases. "
                    f"If you don't know the answer, respond with '{complete_answer_not_found_response}'\n"
                    f"Sample response:\n\n{json.dumps(SAMPLE_JSON_RESPONSE)}"
                )
            )
        )
        prompt.append(
            SystemMessage(
                content='Start by reading the following documents and responding with "Acknowledged".'
            )
        )
        for chunk in context_chunks:
            prompt.append(SystemMessage(content=chunk.content))
            prompt.append(AIMessage(content="Acknowledged"))

        prompt.append(HumanMessage(content=f"Question: {query}\n"))

        return prompt

    def process_response(
        self,
        tokens: Iterator[str],
        context_chunks: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_chunks,
            is_json_prompt=True,
        )


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
        self._llm.stream("Ignore this!")

    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> AnswerQuestionReturn:
        trimmed_context_docs = _tiktoken_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        tokens = self._llm.stream(prompt)

        final_answer = ""
        quotes = DanswerQuotes([])
        for output in self._qa_handler.process_response(tokens, trimmed_context_docs):
            if output is None:
                continue

            if isinstance(output, DanswerAnswerPiece):
                if output.answer_piece:
                    final_answer += output.answer_piece
            elif isinstance(output, DanswerQuotes):
                quotes = output

        return DanswerAnswer(final_answer), quotes

    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        trimmed_context_docs = _tiktoken_trim_chunks(context_docs)
        prompt = self._qa_handler.build_prompt(query, trimmed_context_docs)
        tokens = self._llm.stream(prompt)
        yield from self._qa_handler.process_response(tokens, trimmed_context_docs)
