from typing import TYPE_CHECKING

from pydantic import BaseModel

from shared_configs.enums import EmbeddingProvider

if TYPE_CHECKING:
    from danswer.db.models import CloudEmbeddingProvider as CloudEmbeddingProviderModel


class TestEmbeddingRequest(BaseModel):
    cloud_provider_type: EmbeddingProvider
    api_key: str | None = None


class CloudEmbeddingProvider(BaseModel):
    cloud_provider_type: EmbeddingProvider
    api_key: str | None = None

    @classmethod
    def from_request(
        cls, cloud_provider_model: "CloudEmbeddingProviderModel"
    ) -> "CloudEmbeddingProvider":
        return cls(
            cloud_provider_type=cloud_provider_model.cloud_provider_type,
            api_key=cloud_provider_model.api_key,
        )


class CloudEmbeddingProviderCreationRequest(BaseModel):
    cloud_provider_type: EmbeddingProvider
    api_key: str | None = None
