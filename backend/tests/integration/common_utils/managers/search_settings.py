import time

import requests

from danswer.db.models import IndexModelStatus
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.test_models import TestSearchSettings
from tests.integration.common_utils.test_models import TestUser


class SearchSettingsManager:
    @staticmethod
    def create(
        model_name: str = "test-model",
        model_dim: int = 768,
        normalize: bool = True,
        query_prefix: str | None = None,
        passage_prefix: str | None = None,
        index_name: str | None = None,
        provider_type: str | None = None,
        multipass_indexing: bool = False,
        multilingual_expansion: list[str] = [],
        disable_rerank_for_streaming: bool = False,
        rerank_model_name: str | None = None,
        rerank_provider_type: str | None = None,
        rerank_api_key: str | None = None,
        num_rerank: int = 50,
        user_performing_action: TestUser | None = None,
    ) -> TestSearchSettings:
        search_settings_request = {
            "model_name": model_name,
            "model_dim": model_dim,
            "normalize": normalize,
            "query_prefix": query_prefix,
            "passage_prefix": passage_prefix,
            "index_name": index_name,
            "provider_type": provider_type,
            "multipass_indexing": multipass_indexing,
            "multilingual_expansion": multilingual_expansion,
            "disable_rerank_for_streaming": disable_rerank_for_streaming,
            "rerank_model_name": rerank_model_name,
            "rerank_provider_type": rerank_provider_type,
            "rerank_api_key": rerank_api_key,
            "num_rerank": num_rerank,
        }

        response = requests.post(
            url=f"{API_SERVER_URL}/search-settings/set-new-search-settings",
            json=search_settings_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

        response_data = response.json()
        return TestSearchSettings(**response_data)

    @classmethod
    def get_all(
        cls, user_performing_action: TestUser | None = None
    ) -> list[TestSearchSettings]:
        response = requests.get(
            url=f"{API_SERVER_URL}/search-settings/get-all-search-settings",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        response.raise_for_status()
        return [
            TestSearchSettings(**search_settings) for search_settings in response.json()
        ]

    @staticmethod
    def wait_for_sync(
        user_performing_action: TestUser | None = None,
    ) -> None:
        # wait for search settings to swap over
        start = time.time()
        while True:
            search_settings = SearchSettingsManager.get_all(user_performing_action)
            all_up_to_date = True
            for search_settings_instance in search_settings:
                if not search_settings_instance.status == IndexModelStatus.PRESENT:
                    all_up_to_date = False
                    print(
                        f"Search settings {search_settings_instance.id} is not up to date"
                    )

            if all_up_to_date:
                break

            if time.time() - start > MAX_DELAY:
                raise TimeoutError(
                    f"Search settings were not synced within the {MAX_DELAY} seconds"
                )
            else:
                print("Search settings were not synced yet, waiting...")

            time.sleep(2)

    @staticmethod
    def edit(
        search_settings: TestSearchSettings,
        user_performing_action: TestUser | None = None,
    ) -> None:
        response = requests.post(
            url=f"{API_SERVER_URL}/search-settings/update-inference-settings",
            json=search_settings.model_dump(exclude={"id"}),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def get_current(
        user_performing_action: TestUser | None = None,
    ) -> TestSearchSettings:
        response = requests.get(
            url=f"{API_SERVER_URL}/search-settings/get-current-search-settings",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return TestSearchSettings(**response.json())

    @staticmethod
    def verify(
        search_settings: TestSearchSettings,
        user_performing_action: TestUser | None = None,
    ) -> None:
        current_settings = SearchSettingsManager.get_current(user_performing_action)
        if current_settings.model_dump() != search_settings.model_dump():
            raise ValueError("Current search settings do not match expected settings")
