import abc
import json
from collections.abc import Callable
from collections.abc import Generator

import requests
from requests.exceptions import Timeout
from requests.models import Response

from danswer.chunking.models import InferenceChunk
from danswer.configs.constants import ModelHostType
from danswer.configs.model_configs import GEN_AI_API_KEY
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.direct_qa.interfaces import AnswerQuestionReturn
from danswer.direct_qa.interfaces import AnswerQuestionStreamReturn
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_prompts import JsonProcessor
from danswer.direct_qa.qa_prompts import NonChatPromptProcessor
from danswer.direct_qa.qa_utils import process_answer
from danswer.direct_qa.qa_utils import process_model_tokens
from danswer.direct_qa.qa_utils import simulate_streaming_response
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time


logger = setup_logger()


class HostSpecificRequestModel(abc.ABC):
    """Provides a more minimal implementation requirement for extending to new models
    hosted behind REST APIs. Calling class abstracts away all Danswer internal specifics
    """

    @property
    def requires_api_key(self) -> bool:
        """Is this model protected by security features
        Does it need an api key to access the model for inference"""
        return True

    @staticmethod
    @abc.abstractmethod
    def send_model_request(
        filled_prompt: str,
        endpoint: str,
        api_key: str | None,
        max_output_tokens: int,
        stream: bool,
        timeout: int | None,
    ) -> Response:
        """Given a filled out prompt, how to send it to the model API with the
        correct request format with the correct parameters"""
        raise NotImplementedError

    @staticmethod
    @abc.abstractmethod
    def extract_model_output_from_response(
        response: Response,
    ) -> str:
        """Extract the full model output text from a response.
        This is for nonstreaming endpoints"""
        raise NotImplementedError

    @staticmethod
    @abc.abstractmethod
    def generate_model_tokens_from_response(
        response: Response,
    ) -> Generator[str, None, None]:
        """Generate tokens from a streaming response
        This is for streaming endpoints"""
        raise NotImplementedError


class HuggingFaceRequestModel(HostSpecificRequestModel):
    @staticmethod
    def send_model_request(
        filled_prompt: str,
        endpoint: str,
        api_key: str | None,
        max_output_tokens: int,
        stream: bool,  # Not supported by Inference Endpoints (as of Aug 2023)
        timeout: int | None,
    ) -> Response:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        data = {
            "inputs": filled_prompt,
            "parameters": {
                # HuggingFace requires this to be strictly positive from 0.0-100.0 noninclusive
                "temperature": 0.01,
                # Skip the long tail
                "top_p": 0.9,
                "max_new_tokens": max_output_tokens,
            },
        }
        try:
            return requests.post(endpoint, headers=headers, json=data, timeout=timeout)
        except Timeout as error:
            raise Timeout(f"Model inference to {endpoint} timed out") from error

    @staticmethod
    def _hf_extract_model_output(
        response: Response,
    ) -> str:
        if response.status_code != 200:
            response.raise_for_status()

        return json.loads(response.content)[0].get("generated_text", "")

    @staticmethod
    def extract_model_output_from_response(
        response: Response,
    ) -> str:
        return HuggingFaceRequestModel._hf_extract_model_output(response)

    @staticmethod
    def generate_model_tokens_from_response(
        response: Response,
    ) -> Generator[str, None, None]:
        """HF endpoints do not do streaming currently so this function will
        simulate streaming for the meantime but will need to be replaced in
        the future once streaming is enabled."""
        model_out = HuggingFaceRequestModel._hf_extract_model_output(response)
        yield from simulate_streaming_response(model_out)


class ColabDemoRequestModel(HostSpecificRequestModel):
    """Guide found at:
    https://medium.com/@yuhongsun96/host-a-llama-2-api-on-gpu-for-free-a5311463c183
    """

    @property
    def requires_api_key(self) -> bool:
        return False

    @staticmethod
    def send_model_request(
        filled_prompt: str,
        endpoint: str,
        api_key: str | None,  # ngrok basic setup doesn't require this
        max_output_tokens: int,
        stream: bool,
        timeout: int | None,
    ) -> Response:
        headers = {
            "Content-Type": "application/json",
        }

        data = {
            "inputs": filled_prompt,
            "parameters": {
                "temperature": 0.0,
                "max_tokens": max_output_tokens,
            },
        }
        try:
            return requests.post(endpoint, headers=headers, json=data, timeout=timeout)
        except Timeout as error:
            raise Timeout(f"Model inference to {endpoint} timed out") from error

    @staticmethod
    def _colab_demo_extract_model_output(
        response: Response,
    ) -> str:
        if response.status_code != 200:
            response.raise_for_status()

        return json.loads(response.content).get("generated_text", "")

    @staticmethod
    def extract_model_output_from_response(
        response: Response,
    ) -> str:
        return ColabDemoRequestModel._colab_demo_extract_model_output(response)

    @staticmethod
    def generate_model_tokens_from_response(
        response: Response,
    ) -> Generator[str, None, None]:
        model_out = ColabDemoRequestModel._colab_demo_extract_model_output(response)
        yield from simulate_streaming_response(model_out)


def get_host_specific_model_class(model_host_type: str) -> HostSpecificRequestModel:
    if model_host_type == ModelHostType.HUGGINGFACE.value:
        return HuggingFaceRequestModel()
    if model_host_type == ModelHostType.COLAB_DEMO.value:
        return ColabDemoRequestModel()
    else:
        # TODO support Azure, GCP, AWS
        raise ValueError("Invalid model hosting service selected")


class RequestCompletionQA(QAModel):
    def __init__(
        self,
        endpoint: str = GEN_AI_ENDPOINT,
        model_host_type: str = GEN_AI_HOST_TYPE,
        api_key: str | None = GEN_AI_API_KEY,
        prompt_processor: NonChatPromptProcessor = JsonProcessor(),
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        timeout: int | None = None,
    ) -> None:
        self.endpoint = endpoint
        self.api_key = api_key
        self.prompt_processor = prompt_processor
        self.max_output_tokens = max_output_tokens
        self.model_class = get_host_specific_model_class(model_host_type)
        self.timeout = timeout

    @property
    def requires_api_key(self) -> bool:
        return self.model_class.requires_api_key

    def _get_request_response(
        self, query: str, context_docs: list[InferenceChunk], stream: bool
    ) -> Response:
        filled_prompt = self.prompt_processor.fill_prompt(
            query, context_docs, include_metadata=False
        )
        logger.debug(filled_prompt)

        return self.model_class.send_model_request(
            filled_prompt,
            self.endpoint,
            self.api_key,
            self.max_output_tokens,
            stream,
            self.timeout,
        )

    @log_function_time()
    def answer_question(
        self,
        query: str,
        context_docs: list[InferenceChunk],
        metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,  # Unused
    ) -> AnswerQuestionReturn:
        model_api_response = self._get_request_response(
            query, context_docs, stream=False
        )

        model_output = self.model_class.extract_model_output_from_response(
            model_api_response
        )
        logger.debug(model_output)

        return process_answer(model_output, context_docs)

    def answer_question_stream(
        self,
        query: str,
        context_docs: list[InferenceChunk],
    ) -> AnswerQuestionStreamReturn:
        model_api_response = self._get_request_response(
            query, context_docs, stream=False
        )

        token_generator = self.model_class.generate_model_tokens_from_response(
            model_api_response
        )

        yield from process_model_tokens(
            tokens=token_generator,
            context_docs=context_docs,
            is_json_prompt=self.prompt_processor.specifies_json_output,
        )
