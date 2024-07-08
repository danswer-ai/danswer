from typing import TYPE_CHECKING

from pydantic import BaseModel

from danswer.llm.llm_provider_options import fetch_models_for_provider

if TYPE_CHECKING:
    from danswer.db.models import LLMProvider as LLMProviderModel
    from danswer.db.models import CloudEmbeddingProvider as CloudEmbeddingProviderModel


class TestLLMRequest(BaseModel):
    # provider level
    provider: str
    api_key: str | None = None
    api_base: str | None = None
    api_version: str | None = None
    custom_config: dict[str, str] | None = None

    # model level
    default_model_name: str
    fast_default_model_name: str | None = None


class LLMProviderDescriptor(BaseModel):
    """A descriptor for an LLM provider that can be safely viewed by
    non-admin users. Used when giving a list of available LLMs."""

    name: str
    provider: str
    model_names: list[str]
    default_model_name: str
    fast_default_model_name: str | None
    is_default_provider: bool | None

    @classmethod
    def from_model(
        cls, llm_provider_model: "LLMProviderModel"
    ) -> "LLMProviderDescriptor":
        return cls(
            name=llm_provider_model.name,
            provider=llm_provider_model.provider,
            default_model_name=llm_provider_model.default_model_name,
            fast_default_model_name=llm_provider_model.fast_default_model_name,
            is_default_provider=llm_provider_model.is_default_provider,
            model_names=(
                llm_provider_model.model_names
                or fetch_models_for_provider(llm_provider_model.provider)
                or [llm_provider_model.default_model_name]
            ),
        )


class EmbeddingProviderDescriptor(BaseModel):
    """A descriptor for an LLM provider that can be safely viewed by
    non-admin users. Used when giving a list of available LLMs."""

    name: str
    provider: str
    model_names: list[str]
    default_model_name: str
    fast_default_model_name: str | None
    is_default_provider: bool | None

    @classmethod
    def from_model(
        cls, llm_provider_model: "CloudEmbeddingProviderModel"
    ) -> "EmbeddingProviderDescriptor":
        return cls(
            name=llm_provider_model.name,
            provider=llm_provider_model.provider,
            default_model_name=llm_provider_model.default_model_name,
            fast_default_model_name=llm_provider_model.fast_default_model_name,
            is_default_provider=llm_provider_model.is_default_provider,
            model_names=(
                llm_provider_model.model_names
                or fetch_models_for_provider(llm_provider_model.provider)
                or [llm_provider_model.default_model_name]
            ),
        )


class LLMProvider(BaseModel):
    name: str
    provider: str
    api_key: str | None
    api_base: str | None
    api_version: str | None
    custom_config: dict[str, str] | None
    default_model_name: str
    fast_default_model_name: str | None


class LLMProviderUpsertRequest(LLMProvider):
    # should only be used for a "custom" provider
    # for default providers, the built-in model names are used
    model_names: list[str] | None


class FullLLMProvider(LLMProvider):
    id: int
    is_default_provider: bool | None
    model_names: list[str]

    @classmethod
    def from_model(cls, llm_provider_model: "LLMProviderModel") -> "FullLLMProvider":
        return cls(
            id=llm_provider_model.id,
            name=llm_provider_model.name,
            provider=llm_provider_model.provider,
            api_key=llm_provider_model.api_key,
            api_base=llm_provider_model.api_base,
            api_version=llm_provider_model.api_version,
            custom_config=llm_provider_model.custom_config,
            default_model_name=llm_provider_model.default_model_name,
            fast_default_model_name=llm_provider_model.fast_default_model_name,
            is_default_provider=llm_provider_model.is_default_provider,
            model_names=(
                llm_provider_model.model_names
                or fetch_models_for_provider(llm_provider_model.provider)
                or [llm_provider_model.default_model_name]
            ),
        )


class TestEmbeddingRequest(BaseModel):
    # provider level
    provider: str
    api_key: str | None = None
    custom_config: dict[str, str] | None = None
    # model level
    default_model_id: str


class CloudEmbeddingProviderBase(BaseModel):
    name: str
    api_key: str | None = None
    custom_config: dict[str, str] | None = None
    default_model_id: int | None = None

    class Config:
        from_attributes = True


class CloudEmbeddingProviderCreate(CloudEmbeddingProviderBase):
    pass


class CloudEmbeddingProviderUpdate(CloudEmbeddingProviderBase):
    name: str | None = None


class FullCloudEmbeddingProvider(CloudEmbeddingProviderBase):
    id: int

    @classmethod
    def from_request(
        cls, cloud_provider_model: "CloudEmbeddingProviderModel"
    ) -> "FullCloudEmbeddingProvider":
        return cls(
            id=cloud_provider_model.id,
            name=cloud_provider_model.name,
            api_key=cloud_provider_model.api_key,
            custom_config=cloud_provider_model.custom_config,
            default_model_id=cloud_provider_model.default_model_id,
        )
