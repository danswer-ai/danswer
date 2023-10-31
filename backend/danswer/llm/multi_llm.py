import litellm  # type:ignore
from langchain.chat_models import ChatLiteLLM

from danswer.configs.model_configs import GEN_AI_API_VERSION
from danswer.configs.model_configs import GEN_AI_ENDPOINT
from danswer.configs.model_configs import GEN_AI_MAX_OUTPUT_TOKENS
from danswer.configs.model_configs import GEN_AI_MODEL_PROVIDER
from danswer.configs.model_configs import GEN_AI_MODEL_VERSION
from danswer.configs.model_configs import GEN_AI_TEMPERATURE
from danswer.llm.interfaces import LangChainChatLLM
from danswer.llm.utils import should_be_verbose


# If a user configures a different model and it doesn't support all the same
# parameters like frequency and presence, just ignore them
litellm.drop_params = True
litellm.telemetry = False


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
        model_provider: str | None = GEN_AI_MODEL_PROVIDER,
        model_version: str | None = GEN_AI_MODEL_VERSION,
        api_base: str | None = GEN_AI_ENDPOINT,
        api_version: str | None = GEN_AI_API_VERSION,
        max_output_tokens: int = GEN_AI_MAX_OUTPUT_TOKENS,
        temperature: float = GEN_AI_TEMPERATURE,
    ):
        # Litellm Langchain integration currently doesn't take in the api key param
        # Can place this in the call below once integration is in
        litellm.api_key = api_key
        litellm.api_version = api_version

        self._llm = ChatLiteLLM(  # type: ignore
            model=_get_model_str(model_provider, model_version),
            api_base=api_base,
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
