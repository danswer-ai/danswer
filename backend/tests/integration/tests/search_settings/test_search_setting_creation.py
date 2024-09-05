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
from tests.integration.common_utils.test_models import TestUser


def test_creating_and_upgrading_search_settings(reset: None) -> None:
    admin_user: TestUser = UserManager.create(name="admin_user")

    openai_api_key = os.environ.get("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")

    current_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.OPENAI, api_key=openai_api_key, api_url=None
    )

    EmbeddingProviderManager.create(
        test_embedding_provider=current_embedding_provider,
        user_performing_action=admin_user,
    )

    initial_settings = SearchSettingsManager.create_and_set(
        model_name="text-embedding-3-small",
        model_dim=1536,
        provider_type=EmbeddingProvider.OPENAI,
        user_performing_action=admin_user,
    )

    SearchSettingsManager.wait_for_sync(
        new_primary_settings=initial_settings, user_performing_action=admin_user
    )
    SearchSettingsManager.verify(initial_settings, user_performing_action=admin_user)

    new_settings = SearchSettingsManager.create_and_set(
        model_name="text-embedding-3-small",
        model_dim=1536,
        provider_type=EmbeddingProvider.OPENAI,
        user_performing_action=admin_user,
    )

    SearchSettingsManager.wait_for_sync(
        new_primary_settings=new_settings, user_performing_action=admin_user
    )

    SearchSettingsManager.verify(new_settings, user_performing_action=admin_user)

    EmbeddingProviderManager.verify(
        current_embedding_provider, user_performing_action=admin_user
    )

    new_api_key = "sk-new-openai-api-key-example"

    new_settings.api_key = new_api_key

    EmbeddingProviderManager.edit(new_settings, user_performing_action=admin_user)

    EmbeddingProviderManager.verify(new_settings, user_performing_action=admin_user)
