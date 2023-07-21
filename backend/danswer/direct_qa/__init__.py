from typing import Any

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.gpt_4_all import GPT4AllChatCompletionQA
from danswer.direct_qa.gpt_4_all import GPT4AllCompletionQA
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.open_ai import OpenAIChatCompletionQA
from danswer.direct_qa.open_ai import OpenAICompletionQA


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION, **kwargs: Any
) -> QAModel:
    if internal_model == "openai-completion":
        return OpenAICompletionQA(timeout=QA_TIMEOUT, **kwargs)
    elif internal_model == "openai-chat-completion":
        return OpenAIChatCompletionQA(timeout=QA_TIMEOUT, **kwargs)
    elif internal_model == "gpt4all-completion":
        return GPT4AllCompletionQA(**kwargs)
    elif internal_model == "gpt4all-chat-completion":
        return GPT4AllChatCompletionQA(**kwargs)
    else:
        raise UnknownModelError(internal_model)
