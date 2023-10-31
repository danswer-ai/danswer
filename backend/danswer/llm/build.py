from danswer.configs.app_configs import QA_TIMEOUT
from danswer.direct_qa.qa_utils import get_gen_ai_api_key
from danswer.llm.interfaces import LLM
from danswer.llm.multi_llm import DefaultMultiLLM


def get_default_llm(
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
) -> LLM:
    """A single place to fetch the configured LLM for Danswer
    Also allows overriding certain LLM defaults"""
    if api_key is None:
        api_key = get_gen_ai_api_key()

    # TODO rework
    # if (
    #    INTERNAL_MODEL_VERSION == DanswerGenAIModel.REQUEST.value
    #    and GEN_AI_HOST_TYPE == ModelHostType.COLAB_DEMO
    # ):
    #    return GoogleColabDemo(**model_args)  # type: ignore

    return DefaultMultiLLM(api_key=api_key, timeout=timeout)
