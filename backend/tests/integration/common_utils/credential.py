import uuid
from typing import Any

import requests
from pydantic import BaseModel
from requests import Response

from danswer.server.documents.models import CredentialBase
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser

_CREDENTIAL_URL = f"{API_SERVER_URL}/manage/credential"


class TestCredential(BaseModel):
    base_credential: CredentialBase
    id: int | None = None


class CredentialManager:
    @staticmethod
    def build_test_credential(
        credential_json: dict[str, Any] | None = None,
        admin_public: bool = True,
        name: str | None = None,
        source: DocumentSource = DocumentSource.FILE,
        curator_public: bool = True,
        groups: list[int] | None = None,
    ) -> TestCredential:
        if name is None:
            name = "test-credential-" + str(uuid.uuid4())
        base_credential = CredentialBase(
            credential_json=credential_json or {},
            admin_public=admin_public,
            source=source,
            name=name,
            curator_public=curator_public,
            groups=groups or [],
        )
        return TestCredential(base_credential=base_credential)

    @staticmethod
    def send_credential(
        test_credential: TestCredential, user_performing_action: TestUser | None = None
    ) -> Response:
        return requests.post(
            url=_CREDENTIAL_URL,
            json=test_credential.base_credential.model_dump(),
            headers=(
                user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS
            ),
        )

    @staticmethod
    def edit_credential(
        test_credential: TestCredential, user_performing_action: TestUser | None = None
    ) -> Response:
        if not test_credential.id:
            raise ValueError("Credential ID is required to edit a credential")
        return requests.put(
            url=f"{_CREDENTIAL_URL}/{test_credential.id}",
            json=test_credential.base_credential.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

    @staticmethod
    def delete_credential(
        test_credential: TestCredential,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.delete(
            url=f"{_CREDENTIAL_URL}/{test_credential.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok
