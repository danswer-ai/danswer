import time
from uuid import uuid4

import requests
from pydantic import BaseModel

from ee.danswer.server.user_group.models import UserGroup
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.user import TestUser


class TestUserGroup(BaseModel):
    id: int
    name: str
    user_ids: list[str]
    cc_pair_ids: list[int]


class UserGroupManager:
    @staticmethod
    def create(
        name: str | None = None,
        user_ids: list[str] | None = None,
        cc_pair_ids: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestUserGroup:
        name = f"{name}-user-group" if name else f"test-user-group-{uuid4()}"

        request = {
            "name": name,
            "user_ids": user_ids or [],
            "cc_pair_ids": cc_pair_ids or [],
        }
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/user-group",
            json=request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        test_user_group = TestUserGroup(
            id=response.json()["id"],
            name=response.json()["name"],
            user_ids=[user["id"] for user in response.json()["users"]],
            cc_pair_ids=[cc_pair["id"] for cc_pair in response.json()["cc_pairs"]],
        )
        return test_user_group

    @staticmethod
    def edit_user_group(
        user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        if not user_group.id:
            raise ValueError("User group has no ID")
        response = requests.patch(
            f"{API_SERVER_URL}/manage/admin/user-group/{user_group.id}",
            json=user_group.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok

    @staticmethod
    def set_curator(
        test_user_group: TestUserGroup,
        user_to_set_as_curator: TestUser,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        if not user_to_set_as_curator.id:
            raise ValueError("User has no ID")
        set_curator_request = {
            "user_id": user_to_set_as_curator.id,
            "is_curator": True,
        }
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/user-group/{test_user_group.id}/set-curator",
            json=set_curator_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok

    @staticmethod
    def fetch_user_groups(
        user_performing_action: TestUser | None = None,
    ) -> list[UserGroup]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/admin/user-group",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [UserGroup(**ug) for ug in response.json()]

    @staticmethod
    def verify_user_group(
        user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        all_user_groups = UserGroupManager.fetch_user_groups(user_performing_action)
        for fetched_user_group in all_user_groups:
            if user_group.id == fetched_user_group.id:
                if len(user_group.cc_pair_ids) != len(fetched_user_group.cc_pairs):
                    return False
                if len(user_group.user_ids) != len(fetched_user_group.users):
                    return False
                return True
        return False

    @staticmethod
    def wait_for_user_groups_to_sync(
        user_performing_action: TestUser | None = None,
    ) -> None:
        start = time.time()
        while True:
            user_groups = UserGroupManager.fetch_user_groups(user_performing_action)
            if all(ug.is_up_to_date for ug in user_groups):
                return

            if time.time() - start > MAX_DELAY:
                raise TimeoutError("User groups were not synced within the max delay")
            else:
                print("User groups were not synced yet, waiting...")
            time.sleep(2)
