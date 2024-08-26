import uuid

import requests
from pydantic import BaseModel

from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.server.documents.models import CCStatusUpdateRequest
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.server.documents.models import ConnectorCredentialPairMetadata
from tests.integration.common_utils.connector import TestConnector
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.credential import TestCredential
from tests.integration.common_utils.user import TestUser


CC_PAIR_API_URL = f"{API_SERVER_URL}/manage/admin/cc-pair"


class TestConnectorCredentialPair(BaseModel):
    id: int | None = None
    last_action_successful: bool = False
    connector_update_request: ConnectorCredentialPairMetadata | None = None
    status: CCStatusUpdateRequest | None = None
    connector: TestConnector | None = None
    credential: TestCredential | None = None

    def create(
        self,
        connector: TestConnector,
        credential: TestCredential,
        user_performing_action: TestUser | None = None,
        name: str = "",
        is_public: bool = True,
        groups: list[int] = [],
    ):
        if not name:
            name = "test-connector-" + str(uuid.uuid4())
        initial_connector_update_request = ConnectorCredentialPairMetadata(
            name=name,
            is_public=is_public,
            groups=groups,
        )

        response = requests.put(
            url=f"{API_SERVER_URL}/manage/connector/{connector.id}/credential/{credential.id}",
            json=initial_connector_update_request.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        print(response.json())
        try:
            response.raise_for_status()
            self.last_action_successful = True
            print(response.json())
            self.id = response.json().get("data")
            self.connector_update_request = initial_connector_update_request
            self.connector = connector
            self.credential = credential
            print(f"Created connector credential pair {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to create connector credential pair {self.id}")

    def edit(
        self,
    ):
        pass

    def pause(
        self,
        user_performing_action: TestUser | None = None,
    ):
        updated_status_request = CCStatusUpdateRequest(
            status=ConnectorCredentialPairStatus.PAUSED
        )
        response = requests.put(
            url=f"{CC_PAIR_API_URL}/{self.id}/status",
            json=updated_status_request.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            self.status = updated_status_request
            print(f"Paused connector credential pair {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to pause connector credential pair {self.id}")

    def delete(
        self,
        user_performing_action: TestUser | None = None,
    ):
        self.pause(user_performing_action)
        cc_pair_identifier = ConnectorCredentialPairIdentifier(
            connector_id=self.connector.id,
            credential_id=self.credential.id,
        )
        response = requests.put(
            url=f"{API_SERVER_URL}/manage/admin/deletion-attempt",
            json=cc_pair_identifier.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            self.status = CCStatusUpdateRequest(
                status=ConnectorCredentialPairStatus.DELETING
            )
            print(f"Deleted connector credential pair {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to delete connector credential pair {self.id}")
