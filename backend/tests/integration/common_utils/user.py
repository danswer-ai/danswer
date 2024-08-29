from copy import deepcopy
from urllib.parse import urlencode
from uuid import UUID
from uuid import uuid4

import requests
from pydantic import BaseModel

from danswer.db.models import UserRole
from danswer.server.manage.models import AllUsersResponse
from danswer.server.models import FullUserSnapshot
from danswer.server.models import InvitedUserSnapshot
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS


class TestUser(BaseModel):
    email: str
    password: str
    desired_role: UserRole = UserRole.BASIC
    headers: dict = deepcopy(GENERAL_HEADERS)
    id: UUID | None = None


class UserManager:
    @staticmethod
    def build_test_user(
        name: str | None = None,
        desired_role: UserRole = UserRole.BASIC,
    ) -> TestUser:
        if name is None:
            name = f"test{str(uuid4())}"

        email = f"{name}@test.com"
        password = "test"

        return TestUser(email=email, password=password, desired_role=desired_role)

    @staticmethod
    def register_test_user(test_user: TestUser) -> UUID:
        """
        The first user created is given admin permissions
        """
        body = {
            "email": test_user.email,
            "username": test_user.email,
            "password": test_user.password,
        }
        response = requests.post(
            url=f"{API_SERVER_URL}/auth/register",
            json=body,
            headers=GENERAL_HEADERS,
        )
        # response.raise_for_status()
        print(f"Created user {test_user.email}")
        response_json = response.json()

        return response_json["id"]

    @staticmethod
    def login_test_user(test_user: TestUser) -> bool:
        data = urlencode(
            {
                "username": test_user.email,
                "password": test_user.password,
            }
        )
        headers = test_user.headers.copy()
        headers["Content-Type"] = "application/x-www-form-urlencoded"

        response = requests.post(
            url=f"{API_SERVER_URL}/auth/login",
            data=data,
            headers=headers,
        )

        if response.ok:
            result_cookie = next(iter(response.cookies), None)
            if result_cookie:
                test_user.headers[
                    "Cookie"
                ] = f"{result_cookie.name}={result_cookie.value}"
            print(f"Logged in as {test_user.email}")
        else:
            print(f"Failed to login as {test_user.email}")

        return response.ok

    @staticmethod
    def verify_role(test_user: TestUser) -> bool:
        response = requests.get(
            url=f"{API_SERVER_URL}/me",
            headers=test_user.headers,
        )
        response.raise_for_status()
        return test_user.desired_role == UserRole(response.json().get("role", ""))

    @staticmethod
    def set_role(
        user: TestUser, user_to_perform_action: TestUser | None = None
    ) -> bool:
        if user_to_perform_action is None:
            user_to_perform_action = user
        response = requests.patch(
            url=f"{API_SERVER_URL}/manage/set-user-role",
            json={"user_email": user.email, "new_role": user.desired_role.value},
            headers=user_to_perform_action.headers,
        )
        return response.ok

    @staticmethod
    def check_for_user(
        user: TestUser, user_to_perform_action: TestUser | None = None
    ) -> bool:
        if user_to_perform_action is None:
            user_to_perform_action = user
        response = requests.get(
            url=f"{API_SERVER_URL}/manage/users",
            headers=user_to_perform_action.headers
            if user_to_perform_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

        data = response.json()
        all_users = AllUsersResponse(
            accepted=[FullUserSnapshot(**user) for user in data["accepted"]],
            invited=[InvitedUserSnapshot(**user) for user in data["invited"]],
            accepted_pages=data["accepted_pages"],
            invited_pages=data["invited_pages"],
        )
        for accepted_user in all_users.accepted:
            if (
                accepted_user.email == user.email
                and accepted_user.role == user.desired_role
                and accepted_user.id == user.id
            ):
                return True
        return False
