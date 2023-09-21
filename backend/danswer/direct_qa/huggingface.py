from collections.abc import Callable
from typing import Any

from huggingface_hub import InferenceClient  # type:ignore
from huggingface_hub.utils import HfHubHTTPError  # type:ignore

from danswer.chunking.models import InferenceChunk
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_prompts import ChatPromptProcessor
from danswer.direct_qa.qa_prompts import FreeformProcessor
from danswer.direct_qa.qa_prompts import JsonChatProcessor
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.direct_qa.qa_utils import simulate_streaming_response
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


def _build_hf_inference_settings(**kwargs: Any) -> dict[str, Any]:
    """
    Utility to add in some common default values so they don't have to be set every time.
    """
    return {
        "do_sample": False,
        "seed": 69,  # For reproducibility
        **kwargs,
    }


class HuggingFaceCompletionQA(QAModel):
    def __init__(
        self,
        prompt_processor: NonChatPromptProcessor = FreeformProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,
        api_key: str | None = None,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata
        self.client = InferenceClient(model=model_version, token=api_key)

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

        model_output = self.client.text_generation(
            filled_prompt,
            **_build_hf_inference_settings(max_new_tokens=self.max_output_tokens),
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

        model_stream = self.client.text_generation(
            filled_prompt,
            **_build_hf_inference_settings(
                max_new_tokens=self.max_output_tokens, stream=True
            ),
        )

        yield from process_model_tokens(
            tokens=model_stream,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )


class HuggingFaceChatCompletionQA(QAModel):
    """Chat in this class refers to the HuggingFace Conversational API.
    Not to be confused with Chat/Instruction finetuned models.
    Llama2-chat... means it is an Instruction finetuned model, not necessarily that
    it supports Conversational API"""

    def __init__(
        self,
        prompt_processor: ChatPromptProcessor = JsonChatProcessor(),
        model_version: str = GEN_AI_MODEL_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        include_metadata: bool = False,
        api_key: str | None = None,
    ) -> None:
        self.prompt_processor = prompt_processor
        self.max_output_tokens = max_output_tokens
        self.include_metadata = include_metadata
        self.client = InferenceClient(model=model_version, token=api_key)

    @staticmethod
    def _convert_chat_to_hf_conversational_format(
        dialog: list[dict[str, str]]
    ) -> tuple[str, list[str], list[str]]:
        if dialog[-1]["role"] != "user":
            raise Exception(
                "Last message in conversational dialog must be User message"
            )
        user_message = dialog[-1]["content"]
        dialog = dialog[0:-1]
        generated_responses = []
        past_user_inputs = []
        for message in dialog:
            # HuggingFace inference client doesn't support system messages today
            # so lumping them in with user messages
            if message["role"] in ["user", "system"]:
                past_user_inputs += [message["content"]]
            else:
                generated_responses += [message["content"]]
        return user_message, generated_responses, past_user_inputs

    def _get_hf_model_output(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> str:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, self.include_metadata
        )

        (
            query,
            past_responses,
            past_inputs,
        ) = self._convert_chat_to_hf_conversational_format(filled_prompt)

        logger.debug(f"Last Input: {query}")
        logger.debug(f"Past Inputs: {past_inputs}")
        logger.debug(f"Past Responses: {past_responses}")
        try:
            model_output = self.client.conversational(
                query,
                generated_responses=past_responses,
                past_user_inputs=past_inputs,
                parameters={"max_length": self.max_output_tokens},
            )
        except HfHubHTTPError as model_error:
            if model_error.response.status_code == 422:
                raise ValueError(
                    "Selected HuggingFace Model does not support HuggingFace Conversational API,"
                    "try using the huggingface-inference-completion in Danswer instead"
                )
            raise
        logger.debug(model_output)

        return model_output

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
    ) -> AnswerQuestionReturn:
        model_output = self._get_hf_model_output(query, context_docs)

        answer, quotes_dict = process_answer(model_output, context_docs)

        return answer, quotes_dict

    def answer_question_stream(
        self, query: str, context_docs: list[InferenceChunk]
    ) -> AnswerQuestionStreamReturn:
        """As of Aug 2023, HF conversational (chat) endpoints do not support streaming
        So here it is faked by streaming characters within Danswer from the model output
        """
        model_output = self._get_hf_model_output(query, context_docs)

        model_stream = simulate_streaming_response(model_output)

        yield from process_model_tokens(
            tokens=model_stream,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )
