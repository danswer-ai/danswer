import uuid
from datetime import datetime
from typing import Any

import requests
from pydantic import BaseModel

from danswer.connectors.models import InputType
from danswer.server.documents.models import ConnectorUpdateRequest
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser

CREATE_CONNECTOR_URL = f"{API_SERVER_URL}/manage/admin/connector"


class TestConnector(BaseModel):
    id: int | None = None
    last_action_successful: bool = False
    connector_update_request: ConnectorUpdateRequest | None = None

    def create(
        self,
        user_performing_action: TestUser | None = None,
        name: str = "",
        source: DocumentSource = DocumentSource.FILE,
        input_type: InputType = InputType.LOAD_STATE,
        connector_specific_config: dict[str, Any] = {},
        refresh_freq: int | None = None,
        prune_freq: int | None = None,
        indexing_start: datetime | None = None,
        is_public: bool = True,
        groups: list[int] = [],
    ):
        if not name:
            name = "test-connector-" + str(uuid.uuid4())
        initial_connector_update_request = ConnectorUpdateRequest(
            connector_specific_config=connector_specific_config,
            input_type=input_type,
            source=source,
            refresh_freq=refresh_freq,
            indexing_start=indexing_start,
            prune_freq=prune_freq,
            name=name,
            is_public=is_public,
            groups=groups,
        )

        response = requests.post(
            url=CREATE_CONNECTOR_URL,
            json=initial_connector_update_request.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        self.last_action_successful = True
        self.id = response.json().get("id")
        self.connector_update_request = initial_connector_update_request
        print(f"Created connector {self.id}")

    def edit(
        self,
        user_performing_action: TestUser | None = None,
        name: str = "",
        source: DocumentSource = DocumentSource.FILE,
        input_type: InputType = InputType.LOAD_STATE,
        connector_specific_config: dict[str, Any] = {},
        refresh_freq: int | None = None,
        prune_freq: int | None = None,
        indexing_start: datetime | None = None,
        is_public: bool = True,
        groups: list[int] = [],
    ):
        updated_connector_update_request = ConnectorUpdateRequest(
            connector_specific_config=connector_specific_config
            if connector_specific_config
            else self.connector_update_request.connector_specific_config,
            input_type=input_type
            if input_type
            else self.connector_update_request.input_type,
            source=source if source else self.connector_update_request.source,
            name=name if name else self.connector_update_request.name,
            is_public=is_public
            if is_public
            else self.connector_update_request.is_public,
            groups=groups if groups else self.connector_update_request.groups,
            refresh_freq=refresh_freq
            if refresh_freq
            else self.connector_update_request.refresh_freq,
            prune_freq=prune_freq
            if prune_freq
            else self.connector_update_request.prune_freq,
            indexing_start=indexing_start
            if indexing_start
            else self.connector_update_request.indexing_start,
        )
        response = requests.post(
            url=f"{CREATE_CONNECTOR_URL}/{self.id}",
            json=updated_connector_update_request.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            self.id = response.json().get("id")
            self.connector_update_request = updated_connector_update_request
            print(f"Edited connector {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to edit connector {self.id}")

    def delete(
        self,
        user_performing_action: TestUser | None = None,
    ):
        response = requests.delete(
            url=f"{CREATE_CONNECTOR_URL}/{self.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            print(f"Deleted connector {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to delete connector {self.id}")
