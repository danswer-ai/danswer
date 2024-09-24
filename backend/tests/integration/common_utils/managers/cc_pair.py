import time
from datetime import datetime
from typing import Any
from uuid import uuid4

import requests

from danswer.connectors.models import InputType
from danswer.db.enums import AccessType
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.enums import TaskStatus
from danswer.server.documents.models import CCPairPruningTask
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.server.documents.models import ConnectorIndexingStatus
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.managers.connector import ConnectorManager
from tests.integration.common_utils.managers.credential import CredentialManager
from tests.integration.common_utils.test_models import TestCCPair
from tests.integration.common_utils.test_models import TestUser


def _cc_pair_creator(
    connector_id: int,
    credential_id: int,
    name: str | None = None,
    access_type: AccessType = AccessType.PUBLIC,
    groups: list[int] | None = None,
    user_performing_action: TestUser | None = None,
) -> TestCCPair:
    name = f"{name}-cc-pair" if name else f"test-cc-pair-{uuid4()}"

    request = {
        "name": name,
        "access_type": access_type,
        "groups": groups or [],
    }

    response = requests.put(
        url=f"{API_SERVER_URL}/manage/connector/{connector_id}/credential/{credential_id}",
        json=request,
        headers=user_performing_action.headers
        if user_performing_action
        else GENERAL_HEADERS,
    )
    response.raise_for_status()
    return TestCCPair(
        id=response.json()["data"],
        name=name,
        connector_id=connector_id,
        credential_id=credential_id,
        access_type=access_type,
        groups=groups or [],
    )


class CCPairManager:
    @staticmethod
    def create_from_scratch(
        name: str | None = None,
        access_type: AccessType = AccessType.PUBLIC,
        groups: list[int] | None = None,
        source: DocumentSource = DocumentSource.FILE,
        input_type: InputType = InputType.LOAD_STATE,
        connector_specific_config: dict[str, Any] | None = None,
        credential_json: dict[str, Any] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestCCPair:
        connector = ConnectorManager.create(
            name=name,
            source=source,
            input_type=input_type,
            connector_specific_config=connector_specific_config,
            is_public=(access_type == AccessType.PUBLIC),
            groups=groups,
            user_performing_action=user_performing_action,
        )
        credential = CredentialManager.create(
            credential_json=credential_json,
            name=name,
            source=source,
            curator_public=(access_type == AccessType.PUBLIC),
            groups=groups,
            user_performing_action=user_performing_action,
        )
        return _cc_pair_creator(
            connector_id=connector.id,
            credential_id=credential.id,
            name=name,
            access_type=access_type,
            groups=groups,
            user_performing_action=user_performing_action,
        )

    @staticmethod
    def create(
        connector_id: int,
        credential_id: int,
        name: str | None = None,
        access_type: AccessType = AccessType.PUBLIC,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestCCPair:
        return _cc_pair_creator(
            connector_id=connector_id,
            credential_id=credential_id,
            name=name,
            access_type=access_type,
            groups=groups,
            user_performing_action=user_performing_action,
        )

    @staticmethod
    def pause_cc_pair(
        cc_pair: TestCCPair,
        user_performing_action: TestUser | None = None,
    ) -> None:
        result = requests.put(
            url=f"{API_SERVER_URL}/manage/admin/cc-pair/{cc_pair.id}/status",
            json={"status": "PAUSED"},
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        result.raise_for_status()

    @staticmethod
    def delete(
        cc_pair: TestCCPair,
        user_performing_action: TestUser | None = None,
    ) -> None:
        cc_pair_identifier = ConnectorCredentialPairIdentifier(
            connector_id=cc_pair.connector_id,
            credential_id=cc_pair.credential_id,
        )
        result = requests.post(
            url=f"{API_SERVER_URL}/manage/admin/deletion-attempt",
            json=cc_pair_identifier.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        result.raise_for_status()

    @staticmethod
    def get_one(
        cc_pair_id: int,
        user_performing_action: TestUser | None = None,
    ) -> ConnectorIndexingStatus | None:
        response = requests.get(
            f"{API_SERVER_URL}/manage/admin/connector/indexing-status",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        for cc_pair_json in response.json():
            cc_pair = ConnectorIndexingStatus(**cc_pair_json)
            if cc_pair.cc_pair_id == cc_pair_id:
                return cc_pair

        return None

    @staticmethod
    def get_all(
        user_performing_action: TestUser | None = None,
    ) -> list[ConnectorIndexingStatus]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/admin/connector/indexing-status",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [ConnectorIndexingStatus(**cc_pair) for cc_pair in response.json()]

    @staticmethod
    def verify(
        cc_pair: TestCCPair,
        verify_deleted: bool = False,
        user_performing_action: TestUser | None = None,
    ) -> None:
        all_cc_pairs = CCPairManager.get_all(user_performing_action)
        for retrieved_cc_pair in all_cc_pairs:
            if retrieved_cc_pair.cc_pair_id == cc_pair.id:
                if verify_deleted:
                    # We assume that this check will be performed after the deletion is
                    # already waited for
                    raise ValueError(
                        f"CC pair {cc_pair.id} found but should be deleted"
                    )
                if (
                    retrieved_cc_pair.name == cc_pair.name
                    and retrieved_cc_pair.connector.id == cc_pair.connector_id
                    and retrieved_cc_pair.credential.id == cc_pair.credential_id
                    and retrieved_cc_pair.access_type == cc_pair.access_type
                    and set(retrieved_cc_pair.groups) == set(cc_pair.groups)
                ):
                    return

        if not verify_deleted:
            raise ValueError(f"CC pair {cc_pair.id} not found")

    @staticmethod
    def wait_for_indexing(
        cc_pair_test: TestCCPair,
        after: datetime,
        timeout: float = MAX_DELAY,
        user_performing_action: TestUser | None = None,
    ) -> None:
        """after: Wait for an indexing success time after this time"""
        start = time.monotonic()
        while True:
            cc_pairs = CCPairManager.get_all(user_performing_action)
            for cc_pair in cc_pairs:
                if cc_pair.cc_pair_id != cc_pair_test.id:
                    continue

                if cc_pair.last_success and cc_pair.last_success > after:
                    print(f"cc_pair {cc_pair_test.id} indexing complete.")
                    return

            elapsed = time.monotonic() - start
            if elapsed > timeout:
                raise TimeoutError(
                    f"CC pair indexing was not completed within {timeout} seconds"
                )

            print(
                f"Waiting for CC indexing to complete. elapsed={elapsed:.2f} timeout={timeout}"
            )
            time.sleep(5)

    @staticmethod
    def prune(
        cc_pair: TestCCPair,
        user_performing_action: TestUser | None = None,
    ) -> None:
        result = requests.post(
            url=f"{API_SERVER_URL}/manage/admin/cc-pair/{cc_pair.id}/prune",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        result.raise_for_status()

    @staticmethod
    def get_prune_task(
        cc_pair: TestCCPair,
        user_performing_action: TestUser | None = None,
    ) -> CCPairPruningTask:
        response = requests.get(
            url=f"{API_SERVER_URL}/manage/admin/cc-pair/{cc_pair.id}/prune",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return CCPairPruningTask(**response.json())

    @staticmethod
    def wait_for_prune(
        cc_pair_test: TestCCPair,
        after: datetime,
        timeout: float = MAX_DELAY,
        user_performing_action: TestUser | None = None,
    ) -> None:
        """after: The task register time must be after this time."""
        start = time.monotonic()
        while True:
            task = CCPairManager.get_prune_task(cc_pair_test, user_performing_action)
            if not task:
                raise ValueError("Prune task not found.")

            if not task.register_time or task.register_time < after:
                raise ValueError("Prune task register time is too early.")

            if task.status == TaskStatus.SUCCESS:
                # Pruning succeeded
                return

            elapsed = time.monotonic() - start
            if elapsed > timeout:
                raise TimeoutError(
                    f"CC pair pruning was not completed within {timeout} seconds"
                )

            print(
                f"Waiting for CC pruning to complete. elapsed={elapsed:.2f} timeout={timeout}"
            )
            time.sleep(5)

    @staticmethod
    def wait_for_deletion_completion(
        user_performing_action: TestUser | None = None,
    ) -> None:
        start = time.monotonic()
        while True:
            cc_pairs = CCPairManager.get_all(user_performing_action)
            if all(
                cc_pair.cc_pair_status != ConnectorCredentialPairStatus.DELETING
                for cc_pair in cc_pairs
            ):
                return

            if time.monotonic() - start > MAX_DELAY:
                raise TimeoutError(
                    f"CC pairs deletion was not completed within the {MAX_DELAY} seconds"
                )
            else:
                print("Some CC pairs are still being deleted, waiting...")
            time.sleep(2)
