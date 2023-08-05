from typing import Any

import pkg_resources
from openai.error import AuthenticationError
from openai.error import Timeout

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.constants import ModelHostType
from danswer.configs.model_configs import GEN_AI_API_KEY
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import GEN_AI_HUGGINGFACE_API_TOKEN
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.external_model import RequestCompletionQA
from danswer.direct_qa.gpt_4_all import GPT4AllChatCompletionQA
from danswer.direct_qa.gpt_4_all import GPT4AllCompletionQA
from danswer.direct_qa.huggingface_inference import HuggingFaceInferenceChatCompletionQA
from danswer.direct_qa.huggingface_inference import HuggingFaceInferenceCompletionQA
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.open_ai import OpenAIChatCompletionQA
from danswer.direct_qa.open_ai import OpenAICompletionQA
from danswer.direct_qa.qa_prompts import WeakModelFreeformProcessor
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
        except Timeout:
            pass

    return False


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION,
    endpoint: str | None = GEN_AI_ENDPOINT,
    model_host_type: str | None = GEN_AI_HOST_TYPE,
    api_key: str | None = GEN_AI_API_KEY,
    timeout: int = QA_TIMEOUT,
    **kwargs: Any
) -> QAModel:
    if internal_model in [
        DanswerGenAIModel.GPT4ALL.value,
        DanswerGenAIModel.GPT4ALL_CHAT.value,
    ]:
        # gpt4all is not compatible M1 Mac hardware as of Aug 2023
        pkg_resources.get_distribution("gpt4all")

    if internal_model == DanswerGenAIModel.OPENAI.value:
        return OpenAICompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.OPENAI_CHAT.value:
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.GPT4ALL.value:
        return GPT4AllCompletionQA(**kwargs)
    elif internal_model == DanswerGenAIModel.GPT4ALL_CHAT.value:
        return GPT4AllChatCompletionQA(**kwargs)
    elif internal_model == "huggingface-inference-completion":
        api_key = api_key if api_key is not None else GEN_AI_HUGGINGFACE_API_TOKEN
        return HuggingFaceInferenceCompletionQA(api_key=api_key, **kwargs)
    elif internal_model == "huggingface-inference-chat-completion":
        api_key = api_key if api_key is not None else GEN_AI_HUGGINGFACE_API_TOKEN
        return HuggingFaceInferenceChatCompletionQA(api_key=api_key, **kwargs)
    elif internal_model == DanswerGenAIModel.REQUEST.value:
        if endpoint is None or model_host_type is None:
            raise ValueError(
                "Request based GenAI model requires an endpoint and host type"
            )
        if model_host_type == ModelHostType.HUGGINGFACE.value:
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
