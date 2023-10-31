from collections.abc import Mapping
from typing import Any
from typing import cast

import litellm  # type:ignore
from langchain.chat_models import ChatLiteLLM

from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.llm.interfaces import LangChainChatLLM
from danswer.llm.utils import should_be_verbose


# If a user configures a different model and it doesn't support all the same
# parameters like frequency and presence, just ignore them
litellm.drop_params = True
litellm.telemetry = False


class DefaultMultiLLM(LangChainChatLLM):
    """Uses Litellm library to allow easy configuration to use a multitude of LLMs
    See https://python.langchain.com/docs/integrations/chat/litellm"""

    DEFAULT_MODEL_PARAMS = {
        "frequency_penalty": 0,
        "presence_penalty": 0,
    }

    def __init__(
        self,
        api_key: str,
        max_output_tokens: int,
        timeout: int,
        model_version: str,
        temperature: float = GEN_AI_TEMPERATURE,
        *args: list[Any],
        **kwargs: Mapping[str, Any]
    ):
        # Litellm Langchain integration currently doesn't take in the api key param
        # Can place this in the call below once integration is in
        litellm.api_key = api_key

        self._llm = ChatLiteLLM(  # type: ignore
            model=model_version,
            # Prefer using None which is the default value, endpoint could be empty string
            api_base=cast(str, kwargs.get("endpoint")) or None,
            max_tokens=max_output_tokens,
            temperature=temperature,
            request_timeout=timeout,
            model_kwargs=DefaultMultiLLM.DEFAULT_MODEL_PARAMS,
            verbose=should_be_verbose(),
            max_retries=0,  # retries are handled outside of langchain
        )

    @property
    def llm(self) -> ChatLiteLLM:
        return self._llm
