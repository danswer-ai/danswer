"""
This file tests search settings creation, upgrades, and embedding provider management.
"""
import os

from danswer.db.models import EmbeddingProvider
from tests.integration.common_utils.test_models import TestCloudEmbeddingProvider
from tests.integration.tests.search_settings.utils import (
    create_and_test_embedding_provider,
)


def test_creating_openai_embedding_provider(reset: None) -> None:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    test_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.OPENAI,
        api_key=openai_api_key,
        api_url=None,
    )
    create_and_test_embedding_provider(test_embedding_provider)


def test_creating_cohere_embedding_provider(reset: None) -> None:
    cohere_api_key = os.getenv("COHERE_API_KEY")
    test_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.COHERE,
        api_key=cohere_api_key,
        api_url=None,
    )
    create_and_test_embedding_provider(test_embedding_provider)


def test_creating_voyage_embedding_provider(reset: None) -> None:
    voyage_api_key = os.getenv("VOYAGE_API_KEY")
    test_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.VOYAGE,
        api_key=voyage_api_key,
        api_url=None,
    )
    create_and_test_embedding_provider(test_embedding_provider)


def test_creating_google_embedding_provider(reset: None) -> None:
    google_api_key = os.getenv("GOOGLE_API_KEY")

    test_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.GOOGLE,
        api_key=google_api_key,
        api_url=None,
    )
    create_and_test_embedding_provider(test_embedding_provider)


def test_creating_litellm_embedding_provider(reset: None) -> None:
    litellm_api_key = os.getenv("LITELLM_API_KEY")
    litellm_api_url = os.getenv("LITELLM_API_URL")
    test_embedding_provider = TestCloudEmbeddingProvider(
        provider_type=EmbeddingProvider.LITELLM,
        api_key=litellm_api_key,
        api_url=litellm_api_url,
    )
    create_and_test_embedding_provider(test_embedding_provider)
