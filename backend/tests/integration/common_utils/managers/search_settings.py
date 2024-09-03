import time

import requests

from danswer.db.models import IndexModelStatus
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.test_models import TestFullModelVersionResponse
from tests.integration.common_utils.test_models import TestSearchSettings
from tests.integration.common_utils.test_models import TestUser


class SearchSettingsManager:
    @staticmethod
    def create(
        model_name: str = "test-model",
        model_dim: int = 768,
        normalize: bool = True,
        query_prefix: str | None = "",
        passage_prefix: str | None = "",
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

        # Merge the response data with the original request data
        merged_data = {**search_settings_request, **response_data}

        # Add a default status if it's not present in the response
        if "status" not in merged_data:
            merged_data["status"] = IndexModelStatus.PRESENT

        return TestSearchSettings(**merged_data)

    @classmethod
    def get_current(
        cls, user_performing_action: TestUser | None = None
    ) -> dict[str, TestSearchSettings | None]:
        response = requests.get(
            url=f"{API_SERVER_URL}/search-settings/get-all-search-settings",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        response.raise_for_status()
        data = response.json()

        result = {"current_settings": None, "secondary_settings": None}

        if isinstance(data, dict):
            if "current_settings" in data:
                result["current_settings"] = TestSearchSettings(
                    **data["current_settings"]
                )
            if "secondary_settings" in data and data["secondary_settings"]:
                result["secondary_settings"] = TestSearchSettings(
                    **data["secondary_settings"]
                )

        return result

    @classmethod
    def get_all(
        cls, user_performing_action: TestUser | None = None
    ) -> list[TestSearchSettings]:
        from danswer.db.search_settings import get_all_search_settings
        from danswer.db.engine import get_session_context_manager

        with get_session_context_manager() as db_session:
            all_settings = list(get_all_search_settings(db_session))
        return [TestSearchSettings(**item.dict()) for item in all_settings]

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
    def get_primary(
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
    def get_secondary(
        user_performing_action: TestUser | None = None,
    ) -> TestSearchSettings | None:
        response = requests.get(
            url=f"{API_SERVER_URL}/search-settings/get-secondary-search-settings",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        data = response.json()
        return TestSearchSettings(**data) if data else None

    @staticmethod
    def get_all_current(
        user_performing_action: TestUser | None = None,
    ) -> TestFullModelVersionResponse:
        response = requests.get(
            url=f"{API_SERVER_URL}/search-settings/get-all-search-settings",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        data = response.json()
        return TestFullModelVersionResponse(
            current_settings=TestSearchSettings(**data["current_settings"]),
            secondary_settings=TestSearchSettings(**data["secondary_settings"])
            if data["secondary_settings"]
            else None,
        )

    @staticmethod
    def verify(
        search_settings: TestSearchSettings,
        user_performing_action: TestUser | None = None,
    ) -> None:
        current_settings = SearchSettingsManager.get_current(user_performing_action)
        if current_settings.model_dump() != search_settings.model_dump():
            raise ValueError("Current search settings do not match expected settings")
