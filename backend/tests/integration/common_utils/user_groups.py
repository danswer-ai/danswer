import time
from typing import cast
from uuid import UUID
from uuid import uuid4

import requests
from pydantic import BaseModel
from pydantic import Field

from ee.danswer.server.user_group.models import SetCuratorRequest
from ee.danswer.server.user_group.models import UserGroup
from ee.danswer.server.user_group.models import UserGroupCreate
from ee.danswer.server.user_group.models import UserGroupUpdate
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.user import TestUser


class TestUserGroup(BaseModel):
    id: int | None = None
    user_group_creation_request: UserGroupCreate


class UserGroupManager:
    @staticmethod
    def build_test_user_group(
        name: str | None = None,
        user_ids: list[UUID] = Field(default_factory=list),
        cc_pair_ids: list[int] = Field(default_factory=list),
    ) -> TestUserGroup:
        if name is None:
            name = f"test_group_{str(uuid4())}"
        user_group_creation_request = UserGroupCreate(
            name=name,
            user_ids=user_ids,
            cc_pair_ids=cc_pair_ids,
        )
        return TestUserGroup(
            user_group_creation_request=user_group_creation_request,
        )

    @staticmethod
    def upsert_test_user_group(
        test_user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> int:
        if test_user_group.id:
            user_group_update = UserGroupUpdate(
                user_ids=test_user_group.user_group_creation_request.user_ids,
                cc_pair_ids=test_user_group.user_group_creation_request.cc_pair_ids,
            )
            response = requests.patch(
                f"{API_SERVER_URL}/manage/admin/user-group/{test_user_group.id}",
                json=user_group_update.model_dump(),
                headers=user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS,
            )
        else:
            response = requests.post(
                f"{API_SERVER_URL}/manage/admin/user-group",
                json=test_user_group.model_dump(),
                headers=user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS,
            )
        response.raise_for_status()
        return cast(int, response.json()["id"])

    @staticmethod
    def set_curator(
        test_user_group: TestUserGroup,
        user_to_set_as_curator: TestUser,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        set_curator_request = SetCuratorRequest(
            user_id=user_to_set_as_curator.id,
            is_curator=True,
        )
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/user-group/{test_user_group.id}/set-curator",
            json=set_curator_request.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok

    @staticmethod
    def fetch_user_groups() -> list[UserGroup]:
        response = requests.get(f"{API_SERVER_URL}/manage/admin/user-group")
        response.raise_for_status()
        return [UserGroup(**ug) for ug in response.json()]

    @staticmethod
    def verify_user_group(test_user_group: TestUserGroup) -> bool:
        all_user_groups = UserGroupManager.fetch_user_groups()
        for user_group in all_user_groups:
            if user_group.id == test_user_group.id:
                assert len(user_group.cc_pairs) == len(
                    test_user_group.user_group_creation_request.cc_pair_ids
                )
                assert len(user_group.users) == len(
                    test_user_group.user_group_creation_request.user_ids
                )
                return True
        return False

    @staticmethod
    def wait_for_user_groups_to_sync() -> None:
        start = time.time()
        while True:
            user_groups = UserGroupManager.fetch_user_groups()
            if all(ug.is_up_to_date for ug in user_groups):
                return

            if time.time() - start > MAX_DELAY:
                raise TimeoutError("User groups were not synced within the max delay")
            else:
                print("User groups were not synced yet, waiting...")
            time.sleep(2)
