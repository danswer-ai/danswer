import requests

from danswer.server.manage.models import AllUsersResponse
from danswer.server.models import FullUserSnapshot
from danswer.server.models import InvitedUserSnapshot
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.test_models import DATestUser


class TenantManager:
    @staticmethod
    def create(
        tenant_id: str | None = None,
        initial_admin_email: str | None = None,
    ) -> DATestUser:
        body = {
            "tenant_id": tenant_id,
            "owner_email": initial_admin_email,
        }

        response = requests.post(
            url=f"{API_SERVER_URL}/tenants/create",
            json=body,
            headers=GENERAL_HEADERS,
        )

        response.raise_for_status()

        return response.json()

    @staticmethod
    def wai(user: DATestUser, user_to_perform_action: DATestUser | None = None) -> None:
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
            if accepted_user.email == user.email and accepted_user.id == user.id:
                return
        raise ValueError(f"User {user.email} not found")
