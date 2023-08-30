from typing import Any

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.model_configs import API_TYPE_OPENAI
from danswer.configs.model_configs import GEN_AI_API_KEY
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.llm.azure import AzureGPT
from danswer.llm.llm import LLM
from danswer.llm.openai import OpenAIGPT


def get_llm_from_model(model: str, **kwargs: Any) -> LLM:
    if model == DanswerGenAIModel.OPENAI_CHAT.value:
        if API_TYPE_OPENAI == "azure":
            return AzureGPT(**kwargs)
        return OpenAIGPT(**kwargs)

    raise ValueError(f"Unknown LLM model: {model}")


def get_default_llm(**kwargs: Any) -> LLM:
    return get_llm_from_model(
        model=INTERNAL_MODEL_VERSION,
        api_key=GEN_AI_API_KEY,
        model_version=GEN_AI_MODEL_VERSION,
        endpoint=GEN_AI_ENDPOINT,
        model_host_type=GEN_AI_HOST_TYPE,
        timeout=QA_TIMEOUT,
        max_output_tokens=GEN_AI_MAX_OUTPUT_TOKENS,
        **kwargs,
    )
