import time
from uuid import UUID
from uuid import uuid4

import requests
from pydantic import BaseModel
from pydantic import Field
from requests import Response

from ee.danswer.server.user_group.models import UserGroup
from ee.danswer.server.user_group.models import UserGroupCreate
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
    def send_user_group(
        test_user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> Response:
        request = {
            "name": test_user_group.user_group_creation_request.name,
            "user_ids": [
                str(uid) for uid in test_user_group.user_group_creation_request.user_ids
            ],
            "cc_pair_ids": test_user_group.user_group_creation_request.cc_pair_ids,
        }
        return requests.post(
            f"{API_SERVER_URL}/manage/admin/user-group",
            json=request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

    @staticmethod
    def edit_user_group(
        test_user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> Response:
        if not test_user_group.id:
            raise ValueError("User group has no ID")
        user_group_update = {
            "user_ids": [
                str(uid) for uid in test_user_group.user_group_creation_request.user_ids
            ],
            "cc_pair_ids": test_user_group.user_group_creation_request.cc_pair_ids,
        }
        return requests.patch(
            f"{API_SERVER_URL}/manage/admin/user-group/{test_user_group.id}",
            json=user_group_update,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

    @staticmethod
    def set_curator(
        test_user_group: TestUserGroup,
        user_to_set_as_curator: TestUser,
        user_performing_action: TestUser | None = None,
    ) -> Response:
        if not user_to_set_as_curator.id:
            raise ValueError("User has no ID")
        set_curator_request = {
            "user_id": str(user_to_set_as_curator.id),
            "is_curator": True,
        }
        return requests.post(
            f"{API_SERVER_URL}/manage/admin/user-group/{test_user_group.id}/set-curator",
            json=set_curator_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

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
        test_user_group: TestUserGroup,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        all_user_groups = UserGroupManager.fetch_user_groups(user_performing_action)
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
