import abc
from collections.abc import Iterator

import litellm  # type:ignore
from langchain.chat_models import ChatLiteLLM
from langchain.chat_models.base import BaseChatModel
from langchain.schema.language_model import LanguageModelInput

from danswer.configs.app_configs import LOG_ALL_MODEL_INTERACTIONS
from danswer.configs.model_configs import GEN_AI_API_ENDPOINT
from danswer.configs.model_configs import GEN_AI_API_VERSION
from danswer.configs.model_configs import GEN_AI_LLM_PROVIDER_TYPE
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_PROVIDER
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.llm.interfaces import LLM
from danswer.llm.utils import message_generator_to_string_generator
from danswer.llm.utils import should_be_verbose
from danswer.utils.logger import setup_logger


logger = setup_logger()

# If a user configures a different model and it doesn't support all the same
# parameters like frequency and presence, just ignore them
litellm.drop_params = True
litellm.telemetry = False


class LangChainChatLLM(LLM, abc.ABC):
    @property
    @abc.abstractmethod
    def llm(self) -> BaseChatModel:
        raise NotImplementedError

    @staticmethod
    def _log_prompt(prompt: LanguageModelInput) -> None:
        if isinstance(prompt, list):
            for ind, msg in enumerate(prompt):
                logger.debug(f"Message {ind}:\n{msg.content}")
        if isinstance(prompt, str):
            logger.debug(f"Prompt:\n{prompt}")

    def log_model_configs(self) -> None:
        llm_dict = {k: v for k, v in self.llm.__dict__.items() if v}
        llm_dict.pop("client")
        logger.info(
            f"LLM Model Class: {self.llm.__class__.__name__}, Model Config: {llm_dict}"
        )

    def invoke(self, prompt: LanguageModelInput) -> str:
        if LOG_ALL_MODEL_INTERACTIONS:
            self._log_prompt(prompt)

        model_raw = self.llm.invoke(prompt).content
        if LOG_ALL_MODEL_INTERACTIONS:
            logger.debug(f"Raw Model Output:\n{model_raw}")

        if not isinstance(model_raw, str):
            raise RuntimeError(
                "Model output inconsistent with expected type, "
                "is this related to a library upgrade?"
            )

        return model_raw

    def stream(self, prompt: LanguageModelInput) -> Iterator[str]:
        if LOG_ALL_MODEL_INTERACTIONS:
            self._log_prompt(prompt)

        output_tokens = []
        for token in message_generator_to_string_generator(self.llm.stream(prompt)):
            output_tokens.append(token)
            yield token

        full_output = "".join(output_tokens)
        if LOG_ALL_MODEL_INTERACTIONS:
            logger.debug(f"Raw Model Output:\n{full_output}")


def _get_model_str(
    model_provider: str | None,
    model_version: str | None,
) -> str:
    if model_provider and model_version:
        return model_provider + "/" + model_version

    if model_version:
        # Litellm defaults to openai if no provider specified
        # It's implicit so no need to specify here either
        return model_version

    # User specified something wrong, just use Danswer default
    return GEN_AI_MODEL_VERSION


class DefaultMultiLLM(LangChainChatLLM):
    """Uses Litellm library to allow easy configuration to use a multitude of LLMs
    See https://python.langchain.com/docs/integrations/chat/litellm"""

    DEFAULT_MODEL_PARAMS = {
        "frequency_penalty": 0,
        "presence_penalty": 0,
    }

    def __init__(
        self,
        api_key: str | None,
        timeout: int,
        model_provider: str = GEN_AI_MODEL_PROVIDER,
        model_version: str = GEN_AI_MODEL_VERSION,
        api_base: str | None = GEN_AI_API_ENDPOINT,
        api_version: str | None = GEN_AI_API_VERSION,
        custom_llm_provider: str | None = GEN_AI_LLM_PROVIDER_TYPE,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        temperature: float = GEN_AI_TEMPERATURE,
    ):
        # Litellm Langchain integration currently doesn't take in the api key param
        # Can place this in the call below once integration is in
        litellm.api_key = api_key or "dummy-key"
        litellm.api_version = api_version

        self._llm = ChatLiteLLM(  # type: ignore
            model=model_version
            if custom_llm_provider
            else _get_model_str(model_provider, model_version),
            api_base=api_base,
            custom_llm_provider=custom_llm_provider,
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
