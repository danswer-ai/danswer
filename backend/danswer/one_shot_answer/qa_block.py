import abc
import re
from collections.abc import Callable
from collections.abc import Iterator
from typing import cast

from danswer.chat.chat_utils import build_complete_context_str
from danswer.chat.models import AnswerQuestionStreamReturn
from danswer.chat.models import DanswerAnswer
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import DanswerQuotes
from danswer.chat.models import LlmDoc
from danswer.chat.models import LLMMetricsContainer
from danswer.chat.models import StreamingError
from danswer.configs.chat_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.constants import DISABLED_GEN_AI_MSG
from danswer.indexing.models import InferenceChunk
from danswer.llm.interfaces import LLM
from danswer.llm.utils import check_number_of_tokens
from danswer.llm.utils import get_default_llm_token_encode
from danswer.one_shot_answer.interfaces import QAModel
from danswer.one_shot_answer.qa_utils import process_answer
from danswer.one_shot_answer.qa_utils import process_model_tokens
from danswer.prompts.direct_qa_prompts import CONTEXT_BLOCK
from danswer.prompts.direct_qa_prompts import COT_PROMPT
from danswer.prompts.direct_qa_prompts import HISTORY_BLOCK
from danswer.prompts.direct_qa_prompts import JSON_PROMPT
from danswer.prompts.direct_qa_prompts import LANGUAGE_HINT
from danswer.prompts.direct_qa_prompts import ONE_SHOT_SYSTEM_PROMPT
from danswer.prompts.direct_qa_prompts import ONE_SHOT_TASK_PROMPT
from danswer.prompts.direct_qa_prompts import PARAMATERIZED_PROMPT
from danswer.prompts.direct_qa_prompts import PARAMATERIZED_PROMPT_WITHOUT_CONTEXT
from danswer.prompts.direct_qa_prompts import WEAK_LLM_PROMPT
from danswer.prompts.direct_qa_prompts import WEAK_MODEL_SYSTEM_PROMPT
from danswer.prompts.direct_qa_prompts import WEAK_MODEL_TASK_PROMPT
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import clean_up_code_blocks
from danswer.utils.text_processing import escape_newlines

logger = setup_logger()


class QAHandler(abc.ABC):
    @property
    @abc.abstractmethod
    def is_json_output(self) -> bool:
        """Does the model output a valid json with answer and quotes keys? Most flows with a
        capable model should output a json. This hints to the model that the output is used
        with a downstream system rather than freeform creative output. Most models should be
        finetuned to recognize this."""
        raise NotImplementedError

    @abc.abstractmethod
    def build_prompt(
        self,
        query: str,
        history_str: str,
        context_chunks: list[InferenceChunk],
    ) -> str:
        raise NotImplementedError

    def process_llm_token_stream(
        self, tokens: Iterator[str], context_chunks: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        yield from process_model_tokens(
            tokens=tokens,
            context_docs=context_chunks,
            is_json_prompt=self.is_json_output,
        )


class WeakLLMQAHandler(QAHandler):
    """Since Danswer supports a variety of LLMs, this less demanding prompt is provided
    as an option to use with weaker LLMs such as small version, low float precision, quantized,
    or distilled models. It only uses one context document and has very weak requirements of
    output format.
    """

    def __init__(
        self,
        system_prompt: str | None,
        task_prompt: str | None,
    ) -> None:
        if not system_prompt and not task_prompt:
            self.system_prompt = WEAK_MODEL_SYSTEM_PROMPT
            self.task_prompt = WEAK_MODEL_TASK_PROMPT
        else:
            self.system_prompt = system_prompt or ""
            self.task_prompt = task_prompt or ""

        self.task_prompt = self.task_prompt.rstrip()
        if self.task_prompt and self.task_prompt[0] != "\n":
            self.task_prompt = "\n" + self.task_prompt

    @property
    def is_json_output(self) -> bool:
        return False

    def build_prompt(
        self,
        query: str,
        history_str: str,
        context_chunks: list[InferenceChunk],
    ) -> str:
        context_block = ""
        if context_chunks:
            context_block = CONTEXT_BLOCK.format(
                context_docs_str=context_chunks[0].content
            )

        prompt_str = WEAK_LLM_PROMPT.format(
            system_prompt=self.system_prompt,
            context_block=context_block,
            task_prompt=self.task_prompt,
            user_query=query,
        )
        return prompt_str


class SingleMessageQAHandler(QAHandler):
    def __init__(
        self,
        system_prompt: str | None,
        task_prompt: str | None,
        use_language_hint: bool = bool(MULTILINGUAL_QUERY_EXPANSION),
    ) -> None:
        self.use_language_hint = use_language_hint
        if not system_prompt and not task_prompt:
            self.system_prompt = ONE_SHOT_SYSTEM_PROMPT
            self.task_prompt = ONE_SHOT_TASK_PROMPT
        else:
            self.system_prompt = system_prompt or ""
            self.task_prompt = task_prompt or ""

        self.task_prompt = self.task_prompt.rstrip()
        if self.task_prompt and self.task_prompt[0] != "\n":
            self.task_prompt = "\n" + self.task_prompt

    @property
    def is_json_output(self) -> bool:
        return True

    def build_prompt(
        self, query: str, history_str: str, context_chunks: list[InferenceChunk]
    ) -> str:
        context_block = ""
        if context_chunks:
            context_docs_str = build_complete_context_str(
                cast(list[LlmDoc | InferenceChunk], context_chunks)
            )
            context_block = CONTEXT_BLOCK.format(context_docs_str=context_docs_str)

        history_block = ""
        if history_str:
            history_block = HISTORY_BLOCK.format(history_str=history_str)

        full_prompt = JSON_PROMPT.format(
            system_prompt=self.system_prompt,
            context_block=context_block,
            history_block=history_block,
            task_prompt=self.task_prompt,
            user_query=query,
            language_hint_or_none=LANGUAGE_HINT.strip()
            if self.use_language_hint
            else "",
        ).strip()
        return full_prompt


# This one isn't used, currently only streaming prompts are used
class SingleMessageScratchpadHandler(QAHandler):
    def __init__(
        self,
        system_prompt: str | None,
        task_prompt: str | None,
        use_language_hint: bool = bool(MULTILINGUAL_QUERY_EXPANSION),
    ) -> None:
        self.use_language_hint = use_language_hint
        if not system_prompt and not task_prompt:
            self.system_prompt = ONE_SHOT_SYSTEM_PROMPT
            self.task_prompt = ONE_SHOT_TASK_PROMPT
        else:
            self.system_prompt = system_prompt or ""
            self.task_prompt = task_prompt or ""

        self.task_prompt = self.task_prompt.rstrip()
        if self.task_prompt and self.task_prompt[0] != "\n":
            self.task_prompt = "\n" + self.task_prompt

    @property
    def is_json_output(self) -> bool:
        return True

    def build_prompt(
        self, query: str, history_str: str, context_chunks: list[InferenceChunk]
    ) -> str:
        context_docs_str = build_complete_context_str(
            cast(list[LlmDoc | InferenceChunk], context_chunks)
        )

        # Outdated
        prompt = COT_PROMPT.format(
            context_docs_str=context_docs_str,
            user_query=query,
            language_hint_or_none=LANGUAGE_HINT.strip()
            if self.use_language_hint
            else "",
        ).strip()

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


def build_dummy_prompt(
    system_prompt: str, task_prompt: str, retrieval_disabled: bool
) -> str:
    if retrieval_disabled:
        return PARAMATERIZED_PROMPT_WITHOUT_CONTEXT.format(
            user_query="<USER_QUERY>",
            system_prompt=system_prompt,
            task_prompt=task_prompt,
        ).strip()

    return PARAMATERIZED_PROMPT.format(
        context_docs_str="<CONTEXT_DOCS>",
        user_query="<USER_QUERY>",
        system_prompt=system_prompt,
        task_prompt=task_prompt,
    ).strip()


def no_gen_ai_response() -> Iterator[DanswerAnswerPiece]:
    yield DanswerAnswerPiece(answer_piece=DISABLED_GEN_AI_MSG)


class QABlock(QAModel):
    def __init__(self, llm: LLM, qa_handler: QAHandler) -> None:
        self._llm = llm
        self._qa_handler = qa_handler

    def build_prompt(
        self,
        query: str,
        history_str: str,
        context_chunks: list[InferenceChunk],
    ) -> str:
        prompt = self._qa_handler.build_prompt(
            query=query, history_str=history_str, context_chunks=context_chunks
        )
        return prompt

    def answer_question_stream(
        self,
        prompt: str,
        llm_context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionStreamReturn:
        tokens_stream = self._llm.stream(prompt)

        captured_tokens = []

        try:
            for answer_piece in self._qa_handler.process_llm_token_stream(
                iter(tokens_stream), llm_context_docs
            ):
                if (
                    isinstance(answer_piece, DanswerAnswerPiece)
                    and answer_piece.answer_piece
                ):
                    captured_tokens.append(answer_piece.answer_piece)
                yield answer_piece

        except Exception as e:
            yield StreamingError(error=str(e))

        if metrics_callback is not None:
            prompt_tokens = check_number_of_tokens(
                text=str(prompt), encode_fn=get_default_llm_token_encode()
            )

            response_tokens = check_number_of_tokens(
                text="".join(captured_tokens), encode_fn=get_default_llm_token_encode()
            )

            metrics_callback(
                LLMMetricsContainer(
                    prompt_tokens=prompt_tokens, response_tokens=response_tokens
                )
            )
