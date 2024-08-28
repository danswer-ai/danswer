import uuid
from datetime import datetime
from typing import Any

import requests
from pydantic import BaseModel
from pydantic import Field

from danswer.connectors.models import InputType
from danswer.server.documents.models import ConnectorUpdateRequest
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser

_CONNECTOR_URL = f"{API_SERVER_URL}/manage/admin/connector"


class TestConnector(BaseModel):
    id: int | None = None
    connector_update_request: ConnectorUpdateRequest


class ConnectorManager:
    @staticmethod
    def build_test_connector(
        name: str | None = None,
        source: DocumentSource = DocumentSource.FILE,
        input_type: InputType = InputType.LOAD_STATE,
        connector_specific_config: dict[str, Any] = Field(default_factory=dict),
        refresh_freq: int | None = None,
        prune_freq: int | None = None,
        indexing_start: datetime | None = None,
        is_public: bool = True,
        groups: list[int] = Field(default_factory=list),
    ) -> TestConnector:
        if not name:
            name = "test-connector-" + str(uuid.uuid4())

        connector = ConnectorUpdateRequest(
            name=name,
            source=source,
            input_type=input_type,
            connector_specific_config=connector_specific_config,
            refresh_freq=refresh_freq,
            prune_freq=prune_freq,
            indexing_start=indexing_start,
            is_public=is_public,
            groups=groups,
        )

        return TestConnector(connector_update_request=connector)

    @staticmethod
    def upsert_test_connector(
        test_connector: TestConnector,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        request = test_connector.connector_update_request.model_dump()
        if test_connector.id:
            response = requests.post(
                url=f"{_CONNECTOR_URL}/{test_connector.id}",
                json=request,
                headers=user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS,
            )
        else:
            response = requests.post(
                url=_CONNECTOR_URL,
                json=request,
                headers=user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS,
            )
        if response.ok:
            test_connector.id = response.json().get("id")
        return response.ok

    @staticmethod
    def delete(
        test_connector: TestConnector,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.delete(
            url=f"{_CONNECTOR_URL}/{test_connector.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok
