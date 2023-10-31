from collections.abc import Mapping
from typing import Any

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.constants import ModelHostType
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_HOST_TYPE
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.llm.google_colab_demo import GoogleColabDemo
from danswer.llm.interfaces import LLM
from danswer.llm.multi_llm import DefaultMultiLLM


def get_default_llm(
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
) -> LLM:
    """NOTE: api_key/timeout must be a special args since we may want to check
    if an API key is valid for the default model setup OR we may want to use the
    default model with a different timeout specified."""
    if api_key is None:
        api_key = get_gen_ai_api_key()

    model_args: Mapping[str, Any] = {
        # provide a dummy key since LangChain will throw an exception if not
        # given, which would prevent server startup
        "api_key": api_key or "dummy_api_key",
        "timeout": timeout,
        "model_version": GEN_AI_MODEL_VERSION,
        "endpoint": GEN_AI_ENDPOINT,
        "max_output_tokens": GEN_AI_MAX_OUTPUT_TOKENS,
        "temperature": GEN_AI_TEMPERATURE,
    }

    if (
        INTERNAL_MODEL_VERSION == DanswerGenAIModel.REQUEST.value
        and GEN_AI_HOST_TYPE == ModelHostType.COLAB_DEMO
    ):
        return GoogleColabDemo(**model_args)  # type: ignore

    return DefaultMultiLLM(**model_args)
