import abc
from collections.abc import Iterator

from langchain.chat_models.base import BaseChatModel
from langchain.schema.language_model import LanguageModelInput

from danswer.configs.app_configs import LOG_ALL_MODEL_INTERACTIONS
from danswer.llm.utils import message_generator_to_string_generator
from danswer.utils.logger import setup_logger


logger = setup_logger()


class LLM(abc.ABC):
    """Mimics the LangChain LLM / BaseChatModel interfaces to make it easy
    to use these implementations to connect to a variety of LLM providers."""

    @property
    def requires_warm_up(self) -> bool:
        """Is this model running in memory and needs an initial call to warm it up?"""
        return False

    @abc.abstractmethod
    def invoke(self, prompt: LanguageModelInput) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def stream(self, prompt: LanguageModelInput) -> Iterator[str]:
        raise NotImplementedError


class LangChainChatLLM(LLM, abc.ABC):
    @property
    @abc.abstractmethod
    def llm(self) -> BaseChatModel:
        raise NotImplementedError

    def _log_model_config(self) -> None:
        logger.debug(
            f"Model Class: {self.llm.__class__.__name__}, Model Config: {self.llm.__dict__}"
        )

    @staticmethod
    def _log_prompt(prompt: LanguageModelInput) -> None:
        if isinstance(prompt, list):
            for ind, msg in enumerate(prompt):
                logger.debug(f"Message {ind}:\n{msg.content}")
        if isinstance(prompt, str):
            logger.debug(f"Prompt:\n{prompt}")

    def invoke(self, prompt: LanguageModelInput) -> str:
        self._log_model_config()
        if LOG_ALL_MODEL_INTERACTIONS:
            self._log_prompt(prompt)

        model_raw = self.llm.invoke(prompt).content
        if LOG_ALL_MODEL_INTERACTIONS:
            logger.debug(f"Raw Model Output:\n{model_raw}")

        return model_raw

    def stream(self, prompt: LanguageModelInput) -> Iterator[str]:
        self._log_model_config()
        if LOG_ALL_MODEL_INTERACTIONS:
            self._log_prompt(prompt)

        output_tokens = []
        for token in message_generator_to_string_generator(self.llm.stream(prompt)):
            output_tokens.append(token)
            yield token

        full_output = "".join(output_tokens)
        if LOG_ALL_MODEL_INTERACTIONS:
            logger.debug(f"Raw Model Output:\n{full_output}")
