from collections.abc import Callable
from typing import Any

from danswer.chunking.models import InferenceChunk
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_prompts import ChatPromptProcessor
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_prompts import WeakChatModelFreeformProcessor
from danswer.direct_qa.qa_prompts import WeakModelFreeformProcessor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


class DummyGPT4All:
    """In the case of import failure due to M1 Mac incompatibility,
    so this module does not raise exceptions during server startup,
    as long as this module isn't actually used"""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        raise RuntimeError("GPT4All library not installed.")


try:
    from gpt4all import GPT4All  # type:ignore
except ImportError:
    logger.warning(
        "GPT4All library not installed. "
        "If you wish to run GPT4ALL (in memory) to power Danswer's "
        "Generative AI features, please install gpt4all==1.0.5. "
        "As of Aug 2023, this library is not compatible with M1 Mac."
    )
    GPT4All = DummyGPT4All


GPT4ALL_MODEL: GPT4All | None = None


def get_gpt_4_all_model(
    model_version: str = GEN_AI_MODEL_VERSION,
) -> GPT4All:
    global GPT4ALL_MODEL
    if GPT4ALL_MODEL is None:
        GPT4ALL_MODEL = GPT4All(model_version)
    return GPT4ALL_MODEL


def _build_gpt4all_settings(**kwargs: Any) -> dict[str, Any]:
    """
    Utility to add in some common default values so they don't have to be set every time.
    """
    return {
        "temp": 0,
        **kwargs,
    }


class GPT4AllCompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: NonChatPromptProcessor = WeakModelFreeformProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,  # gpt4all models can't handle this atm
    ) -> None:
        self.prompt_processor = prompt_processor
        self.model_version = model_version
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata

    @property
    def requires_api_key(self) -> bool:
        return False

    def warm_up_model(self) -> None:
        get_gpt_4_all_model(self.model_version)

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,  # Unused
    ) -> AnswerQuestionReturn:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)

        gen_ai_model = get_gpt_4_all_model(self.model_version)

        model_output = gen_ai_model.generate(
            **_build_gpt4all_settings(
                prompt=filled_prompt, max_tokens=self.max_output_tokens
            ),
        )

        logger.debug(model_output)

        return process_answer(model_output, context_docs)

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)

        gen_ai_model = get_gpt_4_all_model(self.model_version)

        model_stream = gen_ai_model.generate(
            **_build_gpt4all_settings(
                prompt=filled_prompt, max_tokens=self.max_output_tokens, streaming=True
            ),
        )

        yield from process_model_tokens(
            tokens=model_stream,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )


class GPT4AllChatCompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: ChatPromptProcessor = WeakChatModelFreeformProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,  # gpt4all models can't handle this atm
    ) -> None:
        self.prompt_processor = prompt_processor
        self.model_version = model_version
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata

    @property
    def requires_api_key(self) -> bool:
        return False

    def warm_up_model(self) -> None:
        get_gpt_4_all_model(self.model_version)

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionReturn:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)

        gen_ai_model = get_gpt_4_all_model(self.model_version)

        with gen_ai_model.chat_session():
            context_msgs = filled_prompt[:-1]
            user_query = filled_prompt[-1].get("content")
            for message in context_msgs:
                gen_ai_model.current_chat_session.append(message)

            model_output = gen_ai_model.generate(
                **_build_gpt4all_settings(
                    prompt=user_query, max_tokens=self.max_output_tokens
                ),
            )

        logger.debug(model_output)

        return process_answer(model_output, context_docs)

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )
        logger.debug(filled_prompt)

        gen_ai_model = get_gpt_4_all_model(self.model_version)

        with gen_ai_model.chat_session():
            context_msgs = filled_prompt[:-1]
            user_query = filled_prompt[-1].get("content")
            for message in context_msgs:
                gen_ai_model.current_chat_session.append(message)

            model_stream = gen_ai_model.generate(
                **_build_gpt4all_settings(
                    prompt=user_query, max_tokens=self.max_output_tokens
                ),
            )

            yield from process_model_tokens(
                tokens=model_stream,
                context_docs=context_docs,
                is_json_prompt=self.prompt_processor.specifies_json_output,
            )
