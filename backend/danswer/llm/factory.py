from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.model_configs import GEN_AI_MODEL_PROVIDER
from danswer.llm.chat_llm import DefaultMultiLLM
from danswer.llm.custom_llm import CustomModelServer
from danswer.llm.gpt_4_all import DanswerGPT4All
from danswer.llm.interfaces import LLM
from danswer.llm.utils import get_gen_ai_api_key


def get_default_llm(
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
) -> LLM:
    """A single place to fetch the configured LLM for Danswer
    Also allows overriding certain LLM defaults"""
    if api_key is None:
        api_key = get_gen_ai_api_key()

    if GEN_AI_MODEL_PROVIDER.lower() == "custom":
        return CustomModelServer(api_key=api_key, timeout=timeout)

    if GEN_AI_MODEL_PROVIDER.lower() == "gpt4all":
        DanswerGPT4All(timeout=timeout)

    return DefaultMultiLLM(api_key=api_key, timeout=timeout)
