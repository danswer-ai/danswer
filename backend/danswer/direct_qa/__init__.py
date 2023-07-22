from typing import Any

from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.model_configs import INTERNAL_MODEL_VERSION
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.gpt_4_all import GPT4AllChatCompletionQA
from danswer.direct_qa.gpt_4_all import GPT4AllCompletionQA
from danswer.direct_qa.interfaces import QAModel
from danswer.direct_qa.open_ai import OpenAIChatCompletionQA
from danswer.direct_qa.open_ai import OpenAICompletionQA
from openai.error import AuthenticationError
from openai.error import Timeout


def check_model_api_key_is_valid(model_api_key: str) -> bool:
    if not model_api_key:
        return False

    qa_model = get_default_backend_qa_model(api_key=model_api_key, timeout=5)

    # try for up to 2 timeouts (e.g. 10 seconds in total)
    for _ in range(2):
        try:
            qa_model.answer_question("Do not respond", [])
            return True
        except AuthenticationError:
            return False
        except Timeout:
            pass

    return False


def get_default_backend_qa_model(
    internal_model: str = INTERNAL_MODEL_VERSION,
    api_key: str | None = None,
    timeout: int = QA_TIMEOUT,
    **kwargs: Any
) -> QAModel:
    if internal_model == "openai-completion":
        return OpenAICompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == "openai-chat-completion":
        return OpenAIChatCompletionQA(timeout=timeout, api_key=api_key, **kwargs)
    elif internal_model == "gpt4all-completion":
        return GPT4AllCompletionQA(**kwargs)
    elif internal_model == "gpt4all-chat-completion":
        return GPT4AllChatCompletionQA(**kwargs)
    else:
        raise UnknownModelError(internal_model)
