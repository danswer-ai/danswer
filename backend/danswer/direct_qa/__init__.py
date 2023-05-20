from typing import Any

from danswer.configs.app_configs import OPENAI_API_KEY
from danswer.configs.constants import OPENAI_API_KEY_STORAGE_KEY
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.question_answer import OpenAIChatCompletionQA
from danswer.direct_qa.question_answer import OpenAICompletionQA
from danswer.dynamic_configs import get_dynamic_config_store


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION, **kwargs: dict[str, Any]
) -> QAModel:
    if internal_model == "openai-completion":
        return OpenAICompletionQA(**kwargs)
    elif internal_model == "openai-chat-completion":
        return OpenAIChatCompletionQA(**kwargs)
    else:
        raise ValueError("Wrong internal QA model set.")
