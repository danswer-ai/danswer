import json
from collections.abc import Iterator
from typing import Any

import requests
from langchain.schema.language_model import LanguageModelInput
from requests import Timeout

from danswer.llm.llm import LLM
from danswer.llm.utils import convert_input


class GoogleColabDemo(LLM):
    def __init__(
        self,
        endpoint: str,
        max_output_tokens: int,
        timeout: int,
        *args: list[Any],
        **kwargs: dict[str, Any],
    ):
        self._endpoint = endpoint
        self._max_output_tokens = max_output_tokens
        self._timeout = timeout

    def _execute(self, input: LanguageModelInput) -> str:
        headers = {
            "Content-Type": "application/json",
        }

        data = {
            "inputs": convert_input(input),
            "parameters": {
                "temperature": 0.0,
                "max_tokens": self._max_output_tokens,
            },
        }
        try:
            response = requests.post(
                self._endpoint, headers=headers, json=data, timeout=self._timeout
            )
        except Timeout as error:
            raise Timeout(f"Model inference to {self._endpoint} timed out") from error

        response.raise_for_status()
        return json.loads(response.content).get("generated_text", "")

    def invoke(self, input: LanguageModelInput) -> str:
        return self._execute(input)

    def stream(self, input: LanguageModelInput) -> Iterator[str]:
        yield self._execute(input)
