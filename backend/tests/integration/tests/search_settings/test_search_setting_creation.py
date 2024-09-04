"""
This file tests search settings creation, upgrades, and embedding provider management.
"""
import os

from danswer.db.models import EmbeddingProvider
from tests.integration.common_utils.managers.embedding_provider import (
    EmbeddingProviderManager,
)
from tests.integration.common_utils.managers.search_settings import (
    SearchSettingsManager,
)
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestCloudEmbeddingProvider
from tests.integration.common_utils.test_models import TestSearchSettings
from tests.integration.common_utils.test_models import TestUser


def test_creating_and_upgrading_search_settings(reset: None) -> None:
    # Create an admin user
    admin_user: TestUser = UserManager.create(name="admin_user")

    # Get OpenAI API key from environment variable
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    # Create an embedding provider using OpenAI
    embedding_provider: TestCloudEmbeddingProvider = EmbeddingProviderManager.create(
        provider_type=EmbeddingProvider.OPENAI,
        api_key=openai_api_key,
        user_performing_action=admin_user,
    )

    # Create initial search settings
    initial_settings: TestSearchSettings = SearchSettingsManager.create(
        model_name="text-embedding-3-small",
        model_dim=1536,
        provider_type=EmbeddingProvider.OPENAI,
        user_performing_action=admin_user,
    )

    # Wait for the initial settings to be applied
    SearchSettingsManager.wait_for_sync(
        new_primary_settings=initial_settings, user_performing_action=admin_user
    )

    # Verify the initial settings
    SearchSettingsManager.verify(initial_settings, user_performing_action=admin_user)

    # Create new search settings (upgrade)
    new_settings: TestSearchSettings = SearchSettingsManager.create(
        model_name="text-embedding-3-small",
        model_dim=1536,
        provider_type=EmbeddingProvider.OPENAI,
        user_performing_action=admin_user,
    )

    # Wait for the new settings to be applied
    SearchSettingsManager.wait_for_sync(
        new_primary_settings=new_settings, user_performing_action=admin_user
    )

    # Verify the new settings
    SearchSettingsManager.verify(new_settings, user_performing_action=admin_user)

    # Ensure the old settings are no longer current
    current_settings: TestSearchSettings = SearchSettingsManager.get_primary(
        user_performing_action=admin_user
    )

    assert current_settings is not None
    assert current_settings.id != initial_settings.id
    assert current_settings.id == new_settings.id

    # Verify the embedding provider
    EmbeddingProviderManager.verify(
        embedding_provider, user_performing_action=admin_user
    )

    # Update the embedding provider with a new API key (for demonstration purposes)
    new_api_key = "sk-new-openai-api-key-example"
    updated_embedding_provider: TestCloudEmbeddingProvider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.OPENAI, api_key=new_api_key, api_url=None
    )
    EmbeddingProviderManager.edit(
        updated_embedding_provider, user_performing_action=admin_user
    )

    # Verify the updated embedding provider
    EmbeddingProviderManager.verify(
        updated_embedding_provider, user_performing_action=admin_user
    )
