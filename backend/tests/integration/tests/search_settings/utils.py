"""
This module contains utility functions and fixtures for testing search settings.
"""
from tests.integration.common_utils.managers.embedding_provider import (
    EmbeddingProviderManager,
)
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestCloudEmbeddingProvider
from tests.integration.common_utils.test_models import TestUser


def create_and_test_embedding_provider(
    test_embedding_provider: TestCloudEmbeddingProvider,
) -> None:
    admin_user: TestUser = UserManager.create(name="admin_user")

    EmbeddingProviderManager.test(
        user_performing_action=admin_user,
        embedding_provider=test_embedding_provider,
    )

    EmbeddingProviderManager.create(
        provider_type=test_embedding_provider.provider_type,
        api_key=test_embedding_provider.api_key,
        user_performing_action=admin_user,
    )

    EmbeddingProviderManager.verify_providers(
        embedding_providers=[test_embedding_provider],
        user_performing_action=admin_user,
    )
