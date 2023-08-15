from typing import Any

import pkg_resources
from openai.error import AuthenticationError

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.constants import ModelHostType
from danswer.configs.model_configs import GEN_AI_API_KEY
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.gpt_4_all import GPT4AllChatCompletionQA
from danswer.direct_qa.gpt_4_all import GPT4AllCompletionQA
from danswer.direct_qa.huggingface import HuggingFaceChatCompletionQA
from danswer.direct_qa.huggingface import HuggingFaceCompletionQA
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.local_transformers import TransformerQA
from danswer.direct_qa.open_ai import OpenAIChatCompletionQA
from danswer.direct_qa.open_ai import OpenAICompletionQA
from danswer.direct_qa.qa_prompts import WeakModelFreeformProcessor
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.direct_qa.request_model import RequestCompletionQA
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logger import setup_logger

logger = setup_logger()


def check_model_api_key_is_valid(model_api_key: str) -> bool:
    if not model_api_key:
        return False

    qa_model = get_default_backend_qa_model(api_key=model_api_key, timeout=5)

    # try for up to 2 timeouts (e.g. 10 seconds in total)
    for _ in range(2):
        try:
            qa_model.answer_question("Do not respond", [])
            return True
        except AuthenticationError:
            return False
        except Exception as e:
            logger.warning(f"GenAI API key failed for the following reason: {e}")

    return False


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION,
    endpoint: str | None = GEN_AI_ENDPOINT,
    model_host_type: str | None = GEN_AI_HOST_TYPE,
    api_key: str | None = GEN_AI_API_KEY,
    timeout: int = QA_TIMEOUT,
    **kwargs: Any,
) -> QAModel:
    if not api_key:
        try:
            api_key = get_gen_ai_api_key()
        except ConfigNotFoundError:
            pass

    if internal_model in [
        DanswerGenAIModel.GPT4ALL.value,
        DanswerGenAIModel.GPT4ALL_CHAT.value,
    ]:
        # gpt4all is not compatible M1 Mac hardware as of Aug 2023
        pkg_resources.get_distribution("gpt4all")

    if internal_model == DanswerGenAIModel.OPENAI.value:
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.OPENAI_CHAT.value:
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.GPT4ALL.value:
        return GPT4AllCompletionQA(**kwargs)
    elif internal_model == DanswerGenAIModel.GPT4ALL_CHAT.value:
        return GPT4AllChatCompletionQA(**kwargs)
    elif internal_model == DanswerGenAIModel.HUGGINGFACE.value:
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.HUGGINGFACE_CHAT.value:
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.TRANSFORMERS:
        return TransformerQA()
    elif internal_model == DanswerGenAIModel.REQUEST.value:
        if endpoint is None or model_host_type is None:
            raise ValueError(
                "Request based GenAI model requires an endpoint and host type"
            )
        if (
            model_host_type == ModelHostType.HUGGINGFACE.value
            or model_host_type == ModelHostType.COLAB_DEMO.value
        ):
            # Assuming user is hosting the smallest size LLMs with weaker capabilities and token limits
            # With the 7B Llama2 Chat model, there is a max limit of 1512 tokens
            # This is the sum of input and output tokens, so cannot take in full Danswer context
            return RequestCompletionQA(
                endpoint=endpoint,
                model_host_type=model_host_type,
                api_key=api_key,
                prompt_processor=WeakModelFreeformProcessor(),
                timeout=timeout,
            )
        return RequestCompletionQA(
            endpoint=endpoint,
            model_host_type=model_host_type,
            api_key=api_key,
            timeout=timeout,
        )
    else:
        raise UnknownModelError(internal_model)
