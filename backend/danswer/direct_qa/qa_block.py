import abc
import json
import re
from collections.abc import Callable
from collections.abc import Iterator
from copy import copy

import tiktoken
from langchain.schema.messages import AIMessage
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import HumanMessage
from langchain.schema.messages import SystemMessage

from danswer.configs.constants import CODE_BLOCK_PAT
from danswer.configs.constants import GENERAL_SEP_PAT
from danswer.configs.constants import QUESTION_PAT
from danswer.configs.constants import THOUGHT_PAT
from danswer.configs.constants import UNCERTAINTY_PAT
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_prompts import EMPTY_SAMPLE_JSON
from danswer.direct_qa.qa_prompts import JsonChatProcessor
from danswer.direct_qa.qa_prompts import WeakModelFreeformProcessor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.indexing.models import InferenceChunk
from danswer.llm.llm import LLM
from danswer.llm.utils import check_number_of_tokens
from danswer.llm.utils import dict_based_prompt_to_langchain_prompt
from danswer.llm.utils import get_default_llm_tokenizer
from danswer.llm.utils import str_prompt_to_langchain_prompt
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_up_code_blocks
from danswer.utils.text_processing import escape_newlines

logger = setup_logger()


class QAHandler(abc.ABC):
    """Evolution of the `PromptProcessor` - handles both building the prompt and
    processing the response. These are necessarily coupled, since the prompt determines
    the response format (and thus how it should be parsed into an answer + quotes)."""

    @abc.abstractmethod
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        raise NotImplementedError

    @property
    def is_json_output(self) -> bool:
        """Does the model expected to output a valid json"""
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


class JsonChatQAHandler(QAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        return dict_based_prompt_to_langchain_prompt(
            JsonChatProcessor.fill_prompt(
                question=query, chunks=context_chunks, include_metadata=False
            )
        )


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


class SingleMessageQAHandler(QAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        context_docs_str = "\n".join(
            f"{CODE_BLOCK_PAT.format(c.content)}" for c in context_chunks
        )

        prompt: list[BaseMessage] = [
            HumanMessage(
                content="You are a question answering system that is constantly learning and improving. "
                "You can process and comprehend vast amounts of text and utilize this knowledge "
                "to provide accurate and detailed answers to diverse queries.\n"
                "You ALWAYS responds with only a json containing an answer and quotes that support the answer.\n"
                "Your responses are as INFORMATIVE and DETAILED as possible.\n"
                f"{GENERAL_SEP_PAT}CONTEXT:\n\n{context_docs_str}"
                f"{GENERAL_SEP_PAT}Sample response:"
                f"{CODE_BLOCK_PAT.format(json.dumps(EMPTY_SAMPLE_JSON))}\n"
                f"{QUESTION_PAT} {query}\n"
                "Hint: Make the answer as DETAILED as possible and respond in JSON format!\n"
                "Quotes MUST be EXACT substrings from provided documents!"
            )
        ]
        return prompt


class SingleMessageScratchpadHandler(QAHandler):
    def build_prompt(
        self, query: str, context_chunks: list[InferenceChunk]
    ) -> list[BaseMessage]:
        cot_block = (
            f"{THOUGHT_PAT} Use this section as a scratchpad to reason through the answer.\n\n"
            f"{json.dumps(EMPTY_SAMPLE_JSON)}"
        )

        context_docs_str = "\n".join(
            f"{CODE_BLOCK_PAT.format(c.content)}" for c in context_chunks
        )

        prompt: list[BaseMessage] = [
            HumanMessage(
                content="You are a question answering system that is constantly learning and improving. "
                "You can process and comprehend vast amounts of text and utilize this knowledge "
                "to provide accurate and detailed answers to diverse queries.\n"
                f"{GENERAL_SEP_PAT}CONTEXT:\n\n{context_docs_str}{GENERAL_SEP_PAT}"
                f"You MUST respond in the following format:"
                f"{CODE_BLOCK_PAT.format(cot_block)}\n"
                f"{QUESTION_PAT} {query}\n"
                "Hint: Make the answer as detailed as possible and use a JSON! "
                "Quotes can ONLY be EXACT substrings from provided documents!"
            )
        ]
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
        raise ValueError(
            "This Scratchpad approach is not suitable for real time uses like streaming"
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
                    f"Sample response:\n\n{json.dumps(EMPTY_SAMPLE_JSON)}"
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
            logger.info(
                "Warming up LLM, this should only run for in memory LLMs like GPT4All"
            )
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
