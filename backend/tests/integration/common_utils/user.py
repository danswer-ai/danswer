import uuid
from urllib.parse import urlencode

import requests
from pydantic import BaseModel

from danswer.db.models import UserRole
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS

USER_REGISTER_URL = f"{API_SERVER_URL}/auth/register"
USER_LOGIN_URL = f"{API_SERVER_URL}/auth/login"
USER_ME_URL = f"{API_SERVER_URL}/me"


class TestUser(BaseModel):
    email: str | None = None
    password: str | None = None
    headers: dict = GENERAL_HEADERS
    id: str | None = None
    role: UserRole | None = None
    last_action_successful: bool = False

    def create(
        self,
        name: str | None = None,
    ):
        """
        The first user created is given super user permissions
        """
        if name is None:
            name = f"test{str(uuid.uuid4())}"
        if self.email is None:
            self.email = f"{name}@test.com"
        if self.password is None:
            self.password = "test"

        body = {
            "email": self.email,
            "username": self.email,
            "password": self.password,
        }
        response = requests.post(
            url=USER_REGISTER_URL,
            json=body,
            headers=GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            response_json = response.json()
            self.id = response_json["id"]
            self.role = UserRole(response_json["role"])
            print(f"Created user {self.email}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to create user {self.email}")

    def login(self) -> int:
        data = urlencode(
            {
                "username": self.email,
                "password": self.password,
            }
        )
        headers = self.headers.copy()
        headers["Content-Type"] = "application/x-www-form-urlencoded"

        response = requests.post(
            url=USER_LOGIN_URL,
            data=data,  # Use 'data' instead of 'json'
            headers=headers,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            result_cookie = None
            for cookie in response.cookies:
                result_cookie = cookie.__dict__
            self.headers["Cookie"] = f"{result_cookie['name']}={result_cookie['value']}"
            print(f"Logged in as {self.email}")
        except requests.HTTPError as e:
            print(e)
            print(f"Failed to login as {self.email}")
            self.last_action_successful = False

    def check_me(self):
        response = requests.get(
            url=USER_ME_URL,
            headers=self.headers,
        )
        response.raise_for_status()
        response_json = response.json()
        print(response_json)
        self.id = response_json["id"]
        self.role = UserRole(response_json["role"])
