import requests

from danswer.db.models import EmbeddingProvider
from danswer.server.manage.embedding.models import TestEmbeddingRequest
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.managers.search_settings import (
    SearchSettingsManager,
)
from tests.integration.common_utils.test_models import TestCloudEmbeddingProvider
from tests.integration.common_utils.test_models import TestUser


class EmbeddingProviderManager:
    @staticmethod
    def test(
        user_performing_action: TestUser, embedding_provider: TestCloudEmbeddingProvider
    ) -> None:
        print(embedding_provider.__dict__)
        test_embedding_request = TestEmbeddingRequest(
            provider_type=embedding_provider.provider_type,
            api_key=embedding_provider.api_key,
            api_url=embedding_provider.api_url,
        )

        response = requests.post(
            url=f"{API_SERVER_URL}/admin/embedding/test-embedding",
            json=test_embedding_request.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        if response.status_code != 200:
            raise ValueError(f"Failed to test embedding provider: {response.json()}")

    @staticmethod
    def create(
        provider_type: EmbeddingProvider | None,
        api_url: str | None = None,
        api_key: str | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestCloudEmbeddingProvider:
        embedding_provider_request = {
            "provider_type": provider_type,
            "api_url": api_url,
            "api_key": api_key,
        }

        response = requests.put(
            url=f"{API_SERVER_URL}/admin/embedding/embedding-provider",
            json=embedding_provider_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

        response_data = response.json()

        return TestCloudEmbeddingProvider(
            provider_type=response_data["provider_type"],
            api_key=response_data.get("api_key"),
            api_url=response_data.get("api_url"),
        )

    @staticmethod
    def get_all(
        user_performing_action: TestUser | None = None,
    ) -> list[TestCloudEmbeddingProvider]:
        response = requests.get(
            url=f"{API_SERVER_URL}/admin/embedding/embedding-provider",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        response.raise_for_status()
        return [
            TestCloudEmbeddingProvider(**embedding_provider)
            for embedding_provider in response.json()
        ]

    @staticmethod
    def edit(
        embedding_provider: TestCloudEmbeddingProvider,
        user_performing_action: TestUser | None = None,
    ) -> None:
        response = requests.put(
            url=f"{API_SERVER_URL}/admin/embedding/embedding-provider",
            json=embedding_provider.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def delete(
        provider_type: EmbeddingProvider,
        user_performing_action: TestUser | None = None,
    ) -> None:
        response = requests.delete(
            url=f"{API_SERVER_URL}/admin/embedding/embedding-provider/{provider_type}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def verify_providers(
        embedding_providers: list[TestCloudEmbeddingProvider],
        user_performing_action: TestUser | None = None,
    ) -> None:
        current_providers = EmbeddingProviderManager.get_all(user_performing_action)

        for expected_provider in embedding_providers:
            matching_provider = next(
                (
                    p
                    for p in current_providers
                    if p.provider_type == expected_provider.provider_type
                ),
                None,
            )

            if matching_provider is None:
                raise ValueError(
                    f"Embedding provider {expected_provider.provider_type} not found in current providers"
                )

            if matching_provider.api_url != expected_provider.api_url:
                raise ValueError(
                    f"API URL mismatch for provider {expected_provider.provider_type}"
                )

            if matching_provider.api_key != expected_provider.api_key:
                raise ValueError(
                    f"API Key mismatch for provider {expected_provider.provider_type}"
                )

    @staticmethod
    def verify(
        embedding_provider: TestCloudEmbeddingProvider,
        user_performing_action: TestUser | None = None,
    ) -> None:
        current_settings = SearchSettingsManager.get_primary(user_performing_action)
        if current_settings is None:
            raise ValueError("No current embedding provider found")

        current_provider_type = current_settings.provider_type

        if current_provider_type is None:
            raise ValueError("No current embedding provider found")

        if current_provider_type != embedding_provider.provider_type:
            raise ValueError(
                f"Current embedding provider {current_provider_type} does not match expected {embedding_provider.provider_type}"
            )
