import abc
from collections.abc import Callable
from collections.abc import Generator
from typing import Any
from typing import cast
from typing import Dict
from typing import Type

from danswer.dynamic_configs.interface import JSON_ro
from danswer.llm.answering.models import ChatMessage
from danswer.llm.answering.models import PreviousMessage
from danswer.llm.interfaces import LLM
from danswer.tools.models import ToolResponse


class Tool(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @property
    @abc.abstractmethod
    def description(self) -> str:
        raise NotImplementedError

    @property
    @abc.abstractmethod
    def display_name(self) -> str:
        raise NotImplementedError

    @classmethod
    @abc.abstractmethod
    def create_prompt(self, message: PreviousMessage) -> str:
        raise NotImplementedError

    """For LLMs which support explicit tool calling"""

    @abc.abstractmethod
    def tool_definition(self) -> dict:
        raise NotImplementedError

    @abc.abstractmethod
    def build_tool_message_content(
        self, *args: ToolResponse
    ) -> str | list[str | dict[str, Any]]:
        raise NotImplementedError

    """For LLMs which do NOT support explicit tool calling"""

    @abc.abstractmethod
    def get_args_for_non_tool_calling_llm(
        self,
        query: str,
        history: list[PreviousMessage],
        llm: LLM,
        force_run: bool = False,
    ) -> dict[str, Any] | None:
        raise NotImplementedError

    """Actual execution of the tool"""

    @abc.abstractmethod
    def run(self, **kwargs: Any) -> Generator[ToolResponse, None, None]:
        raise NotImplementedError

    @abc.abstractmethod
    def final_result(self, *args: ToolResponse) -> JSON_ro:
        """
        This is the "final summary" result of the tool.
        It is the result that will be stored in the database.
        """
        raise NotImplementedError


class ToolRegistry:
    _registry: Dict[str, Type[Tool]] = {}

    @classmethod
    def register(cls, tool_id: str) -> Callable[[type[Tool]], type[Tool]]:
        def decorator(tool_class: Type[Tool]) -> type[Tool]:
            cls._registry[tool_id] = tool_class
            return tool_class

        return decorator

    @classmethod
    def get_tool(cls, tool_id: str) -> Type[Tool]:
        if tool_id not in cls._registry:
            raise ValueError(f"No tool registered with id: {tool_id}")
        return cls._registry[tool_id]

    @classmethod
    def get_prompt(cls, tool_id: str, message: PreviousMessage | ChatMessage) -> str:
        if tool_id not in cls._registry:
            raise ValueError(f"No tool registered with id: {tool_id}")
        tool = cls._registry[tool_id]
        new_prompt = tool.create_prompt(message=cast(PreviousMessage, message))
        return new_prompt
