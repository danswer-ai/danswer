import uuid

import requests
from pydantic import BaseModel

from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.server.documents.models import CCStatusUpdateRequest
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.server.documents.models import ConnectorCredentialPairMetadata
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser


class TestConnectorCredentialPair(BaseModel):
    id: int | None = None
    metadata: ConnectorCredentialPairMetadata
    connector_id: int
    credential_id: int


class CCPairManager:
    @staticmethod
    def build_test_cc_pair(
        connector_id: int,
        credential_id: int,
        name: str | None = None,
        groups: list[int] = [],
        is_public: bool | None = None,
    ) -> TestConnectorCredentialPair:
        if is_public is None:
            is_public = len(groups) == 0
        if not name:
            name = "test-connector-" + str(uuid.uuid4())
        metadata = ConnectorCredentialPairMetadata(
            name=name, is_public=is_public, groups=groups
        )
        return TestConnectorCredentialPair(
            metadata=metadata, connector_id=connector_id, credential_id=credential_id
        )

    @staticmethod
    def upsert_test_cc_pair(
        test_cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.put(
            url=f"{API_SERVER_URL}/manage/connector/{test_cc_pair.connector_id}/credential/{test_cc_pair.credential_id}",
            json=test_cc_pair.metadata.model_dump_json(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        if response.ok:
            test_cc_pair.id = response.json().get("data")
            print(f"Created connector credential pair {test_cc_pair.id}")
        else:
            print(f"Failed to create connector credential pair: {response.status_code}")

        return response.ok

    @staticmethod
    def pause_cc_pair(
        test_cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        if not test_cc_pair.id:
            raise ValueError("Connector credential pair has no id")

        updated_status_request = CCStatusUpdateRequest(
            status=ConnectorCredentialPairStatus.PAUSED
        )
        response = requests.put(
            url=f"{API_SERVER_URL}/manage/admin/cc-pair/{test_cc_pair.id}/status",
            json=updated_status_request.model_dump_json(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        if response.ok:
            # test_cc_pair.status = updated_status_request
            print(f"Paused connector credential pair {test_cc_pair.id}")
        else:
            print(
                f"Failed to pause connector credential pair {test_cc_pair.id}: {response.status_code}"
            )

        return response.ok

    @staticmethod
    def delete_cc_pair(
        test_cc_pair: TestConnectorCredentialPair,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        if not test_cc_pair.id:
            raise ValueError("Connector credential pair has no id")

        pause_result = CCPairManager.pause_cc_pair(test_cc_pair, user_performing_action)
        if not pause_result:
            return False

        cc_pair_identifier = ConnectorCredentialPairIdentifier(
            connector_id=test_cc_pair.connector_id,
            credential_id=test_cc_pair.credential_id,
        )
        response = requests.put(
            url=f"{API_SERVER_URL}/manage/admin/deletion-attempt",
            json=cc_pair_identifier.model_dump_json(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        if response.ok:
            # test_cc_pair.status = CCStatusUpdateRequest(
            #     status=ConnectorCredentialPairStatus.DELETING
            # )
            print(f"Deleted connector credential pair {test_cc_pair.id}")
        else:
            print(
                f"Failed to delete connector credential pair {test_cc_pair.id}: {response.status_code}"
            )

        return response.ok
