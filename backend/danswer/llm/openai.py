import os
from typing import Any
from typing import cast

from langchain.chat_models.openai import ChatOpenAI

from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.llm.llm import LangChainChatLLM
from danswer.llm.utils import should_be_verbose


class OpenAIGPT(LangChainChatLLM):
    def __init__(
        self,
        api_key: str,
        max_output_tokens: int,
        timeout: int,
        model_version: str,
        temperature: float = GEN_AI_TEMPERATURE,
        *args: list[Any],
        **kwargs: dict[str, Any]
    ):
        # set a dummy API key if not specified so that LangChain doesn't throw an
        # exception when trying to initialize the LLM which would prevent the API
        # server from starting up
        if not api_key:
            api_key = os.environ.get("OPENAI_API_KEY") or "dummy_api_key"

        self._llm = ChatOpenAI(
            model=model_version,
            openai_api_key=api_key,
            # Prefer using None which is the default value, endpoint could be empty string
            openai_api_base=cast(str, kwargs.get("endpoint")) or None,
            max_tokens=max_output_tokens,
            temperature=temperature,
            request_timeout=timeout,
            model_kwargs={
                "frequency_penalty": 0,
                "presence_penalty": 0,
            },
            verbose=should_be_verbose(),
            max_retries=0,  # retries are handled outside of langchain
        )

    @property
    def llm(self) -> ChatOpenAI:
        return self._llm
