from typing import Any

from danswer.configs.constants import DanswerGenAIModel
from danswer.configs.model_configs import API_TYPE_OPENAI
from danswer.llm.azure import AzureGPT
from danswer.llm.llm import LLM
from danswer.llm.openai import OpenAIGPT


def get_default_llm(model: str, **kwargs: Any) -> LLM:
    if model == DanswerGenAIModel.OPENAI_CHAT.value:
        if API_TYPE_OPENAI == "azure":
            return AzureGPT(**kwargs)
        return OpenAIGPT(**kwargs)

    raise ValueError(f"Unknown LLM model: {model}")
