from typing import Any

from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.question_answer import OpenAIChatCompletionQA
from danswer.direct_qa.question_answer import OpenAICompletionQA


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION, **kwargs: dict[str, Any]
) -> QAModel:
    if internal_model == "openai-completion":
        return OpenAICompletionQA(**kwargs)
    elif internal_model == "openai-chat-completion":
        return OpenAIChatCompletionQA(**kwargs)
    else:
        raise ValueError("Unknown internal QA model set.")
