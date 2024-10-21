import time
from uuid import uuid4

import requests

from ee.enmedd.server.teamspace.models import Teamspace
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.test_models import DATestTeamspace
from tests.integration.common_utils.test_models import DATestUser


class TeamspaceManager:
    @staticmethod
    def create(
        name: str | None = None,
        user_ids: list[str] | None = None,
        cc_pair_ids: list[int] | None = None,
        user_performing_action: DATestUser | None = None,
    ) -> DATestTeamspace:
        name = f"{name}-teamspace" if name else f"test-teamspace-{uuid4()}"

        request = {
            "name": name,
            "user_ids": user_ids or [],
            "cc_pair_ids": cc_pair_ids or [],
        }
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/teamspace",
            json=request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        test_teamspace = DATestTeamspace(
            id=response.json()["id"],
            name=response.json()["name"],
            user_ids=[user["id"] for user in response.json()["users"]],
            cc_pair_ids=[cc_pair["id"] for cc_pair in response.json()["cc_pairs"]],
        )
        return test_teamspace

    @staticmethod
    def edit(
        teamspace: DATestTeamspace,
        user_performing_action: DATestUser | None = None,
    ) -> None:
        response = requests.patch(
            f"{API_SERVER_URL}/manage/admin/teamspace/{teamspace.id}",
            json=teamspace.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def delete(
        teamspace: DATestTeamspace,
        user_performing_action: DATestUser | None = None,
    ) -> None:
        response = requests.delete(
            f"{API_SERVER_URL}/manage/admin/teamspace/{teamspace.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def set_curator_status(
        test_teamspace: DATestTeamspace,
        user_to_set_as_curator: DATestUser,
        is_curator: bool = True,
        user_performing_action: DATestUser | None = None,
    ) -> None:
        set_curator_request = {
            "user_id": user_to_set_as_curator.id,
            "is_curator": is_curator,
        }
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/teamspace/{test_teamspace.id}/set-curator",
            json=set_curator_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

    @staticmethod
    def get_all(
        user_performing_action: DATestUser | None = None,
    ) -> list[Teamspace]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/admin/teamspace",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [Teamspace(**ug) for ug in response.json()]

    @staticmethod
    def verify(
        teamspace: DATestTeamspace,
        verify_deleted: bool = False,
        user_performing_action: DATestUser | None = None,
    ) -> None:
        all_teamspaces = TeamspaceManager.get_all(user_performing_action)
        for fetched_teamspace in all_teamspaces:
            if teamspace.id == fetched_teamspace.id:
                if verify_deleted:
                    raise ValueError(
                        f"User group {teamspace.id} found but should be deleted"
                    )
                fetched_cc_ids = {cc_pair.id for cc_pair in fetched_teamspace.cc_pairs}
                fetched_user_ids = {user.id for user in fetched_teamspace.users}
                teamspace_cc_ids = set(teamspace.cc_pair_ids)
                teamspace_user_ids = set(teamspace.user_ids)
                if (
                    fetched_cc_ids == teamspace_cc_ids
                    and fetched_user_ids == teamspace_user_ids
                ):
                    return
        if not verify_deleted:
            raise ValueError(f"User group {teamspace.id} not found")

    @staticmethod
    def wait_for_sync(
        teamspaces_to_check: list[DATestTeamspace] | None = None,
        user_performing_action: DATestUser | None = None,
    ) -> None:
        start = time.time()
        while True:
            teamspaces = TeamspaceManager.get_all(user_performing_action)
            if teamspaces_to_check:
                check_ids = {teamspace.id for teamspace in teamspaces_to_check}
                teamspace_ids = {teamspace.id for teamspace in teamspaces}
                if not check_ids.issubset(teamspace_ids):
                    raise RuntimeError("User group not found")
                teamspaces = [
                    teamspace for teamspace in teamspaces if teamspace.id in check_ids
                ]
            if all(ug.is_up_to_date for ug in teamspaces):
                return

            if time.time() - start > MAX_DELAY:
                raise TimeoutError(
                    f"User groups were not synced within the {MAX_DELAY} seconds"
                )
            else:
                print("User groups were not synced yet, waiting...")
            time.sleep(2)

    @staticmethod
    def wait_for_deletion_completion(
        teamspaces_to_check: list[DATestTeamspace],
        user_performing_action: DATestUser | None = None,
    ) -> None:
        start = time.time()
        teamspace_ids_to_check = {teamspace.id for teamspace in teamspaces_to_check}
        while True:
            fetched_teamspaces = TeamspaceManager.get_all(user_performing_action)
            fetched_teamspace_ids = {teamspace.id for teamspace in fetched_teamspaces}
            if not teamspace_ids_to_check.intersection(fetched_teamspace_ids):
                return

            if time.time() - start > MAX_DELAY:
                raise TimeoutError(
                    f"User groups deletion was not completed within the {MAX_DELAY} seconds"
                )
            else:
                print("Some user groups are still being deleted, waiting...")
            time.sleep(2)
