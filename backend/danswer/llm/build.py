from typing import Any

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.model_configs import API_TYPE_OPENAI
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.llm.azure import AzureGPT
from danswer.llm.llm import LLM
from danswer.llm.openai import OpenAIGPT


def get_llm_from_model(model: str, **kwargs: Any) -> LLM:
    if model == DanswerGenAIModel.OPENAI_CHAT.value:
        if API_TYPE_OPENAI == "azure":
            return AzureGPT(**kwargs)
        return OpenAIGPT(**kwargs)

    raise ValueError(f"Unknown LLM model: {model}")


def get_default_llm(
    api_key: str | None = None, timeout: int = QA_TIMEOUT, **kwargs: Any
) -> LLM:
    """NOTE: api_key/timeout must be a special args since we may want to check
    if an API key is valid for the default model setup OR we may want to use the
    default model with a different timeout specified."""
    if api_key is None:
        try:
            api_key = get_gen_ai_api_key()
        except ConfigNotFoundError:
            # if no API key is found, assume this model doesn't need one
            pass

    return get_llm_from_model(
        model=INTERNAL_MODEL_VERSION,
        api_key=api_key,
        timeout=timeout,
        model_version=GEN_AI_MODEL_VERSION,
        endpoint=GEN_AI_ENDPOINT,
        model_host_type=GEN_AI_HOST_TYPE,
        max_output_tokens=GEN_AI_MAX_OUTPUT_TOKENS,
        temperature=GEN_AI_TEMPERATURE,
        **kwargs,
    )
