from typing import TYPE_CHECKING

from pydantic import BaseModel

from shared_configs.enums import EmbeddingProvider

if TYPE_CHECKING:
    from danswer.db.models import CloudEmbeddingProvider as CloudEmbeddingProviderModel


class TestEmbeddingRequest(BaseModel):
    provider_type: EmbeddingProvider
    api_key: str | None = None
    api_url: str | None = None
    model_name: str | None = None


class CloudEmbeddingProvider(BaseModel):
    provider_type: EmbeddingProvider
    api_key: str | None = None
    api_url: str | None = None

    @classmethod
    def from_request(
        cls, cloud_provider_model: "CloudEmbeddingProviderModel"
    ) -> "CloudEmbeddingProvider":
        return cls(
            provider_type=cloud_provider_model.provider_type,
            api_key=cloud_provider_model.api_key,
            api_url=cloud_provider_model.api_url,
        )


class CloudEmbeddingProviderCreationRequest(BaseModel):
    provider_type: EmbeddingProvider
    api_key: str | None = None
    api_url: str | None = None
