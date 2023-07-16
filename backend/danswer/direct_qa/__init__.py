from typing import Any

from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.llm import OpenAIChatCompletionQA
from danswer.direct_qa.llm import OpenAICompletionQA


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION, **kwargs: Any
) -> QAModel:
    if internal_model == "openai-completion":
        return OpenAICompletionQA(**kwargs)
    elif internal_model == "openai-chat-completion":
        return OpenAIChatCompletionQA(**kwargs)
    else:
        raise UnknownModelError(internal_model)
