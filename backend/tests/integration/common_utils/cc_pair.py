import time
import uuid

import requests
from pydantic import BaseModel

from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.server.documents.models import ConnectorIndexingStatus
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.user import TestUser


class TestConnectorCredentialPair(BaseModel):
    id: int
    name: str
    connector_id: int
    credential_id: int
    is_public: bool
    groups: list[int]


class CCPairManager:
    @staticmethod
    def create(
        connector_id: int,
        credential_id: int,
        name: str | None = None,
        is_public: bool = False,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestConnectorCredentialPair:
        if name is None:
            name = "test-cc-pair-" + str(uuid.uuid4())

        request = {
            "name": name,
            "is_public": is_public,
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
        return TestConnectorCredentialPair(
            id=response.json()["data"],
            name=name,
            connector_id=connector_id,
            credential_id=credential_id,
            is_public=is_public,
            groups=groups or [],
        )

    @staticmethod
    def pause_cc_pair(
        cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        return requests.put(
            url=f"{API_SERVER_URL}/manage/admin/cc-pair/{cc_pair.id}/status",
            json={"status": "PAUSED"},
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        ).ok

    @staticmethod
    def delete_cc_pair(
        cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        cc_pair_identifier = ConnectorCredentialPairIdentifier(
            connector_id=cc_pair.connector_id,
            credential_id=cc_pair.credential_id,
        )
        return requests.post(
            url=f"{API_SERVER_URL}/manage/admin/deletion-attempt",
            json=cc_pair_identifier.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        ).ok

    @staticmethod
    def get_all_cc_pairs(
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
    def verify_cc_pair(
        test_cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        all_cc_pairs = CCPairManager.get_all_cc_pairs(user_performing_action)
        for cc_pair in all_cc_pairs:
            if cc_pair.cc_pair_id == test_cc_pair.id:
                return (
                    cc_pair.name == test_cc_pair.name
                    and cc_pair.connector.id == test_cc_pair.connector_id
                    and cc_pair.credential.id == test_cc_pair.credential_id
                    and set(cc_pair.groups) == set(test_cc_pair.groups)
                )
        return False

    @staticmethod
    def wait_for_cc_pairs_deletion_complete(
        user_performing_action: TestUser | None = None,
    ) -> None:
        start = time.time()
        while True:
            cc_pairs = CCPairManager.get_all_cc_pairs(user_performing_action)
            if all(
                cc_pair.cc_pair_status != ConnectorCredentialPairStatus.DELETING
                for cc_pair in cc_pairs
            ):
                return

            if time.time() - start > MAX_DELAY:
                raise TimeoutError(
                    "CC pairs deletion was not completed within the max delay"
                )
            else:
                print("Some CC pairs are still being deleted, waiting...")
            time.sleep(2)
