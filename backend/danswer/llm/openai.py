from typing import Any

from langchain.chat_models.openai import ChatOpenAI

from danswer.llm.llm import LangChainChatLLM
from danswer.llm.utils import should_be_verbose


class OpenAIGPT(LangChainChatLLM):
    def __init__(
        self,
        api_key: str,
        max_output_tokens: int,
        timeout: int,
        model_version: str,
        *args: list[Any],
        **kwargs: dict[str, Any]
    ):
        self._llm = ChatOpenAI(
            model=model_version,
            openai_api_key=api_key,
            max_tokens=max_output_tokens,
            temperature=0,
            request_timeout=timeout,
            model_kwargs={
                "top_p": 1,
                "frequency_penalty": 0,
                "presence_penalty": 0,
            },
            verbose=should_be_verbose(),
        )

    @property
    def llm(self) -> ChatOpenAI:
        return self._llm
