import uuid
from typing import Any

import requests
from pydantic import BaseModel
from pydantic import Field

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
        credential_json: dict[str, Any] = Field(default_factory=dict),
        admin_public: bool = True,
        name: str = Field(default_factory=str),
        source: DocumentSource = DocumentSource.FILE,
        curator_public: bool = True,
        groups: list[int] = Field(default_factory=list),
    ) -> TestCredential:
        base_credential = CredentialBase(
            credential_json=credential_json,
            admin_public=admin_public,
            source=source,
            name=name or "test-credential-" + str(uuid.uuid4()),
            curator_public=curator_public,
            groups=groups,
        )
        return TestCredential(base_credential=base_credential)

    @staticmethod
    def upsert_test_credential(
        test_credential: TestCredential, user_performing_action: TestUser | None = None
    ) -> bool:
        if test_credential.id:
            response = requests.post(
                url=f"{_CREDENTIAL_URL}/{test_credential.id}",
                json=test_credential.model_dump(exclude={"id"}),
                headers=user_performing_action.headers
                if user_performing_action
                else GENERAL_HEADERS,
            )
        else:
            response = requests.post(
                url=_CREDENTIAL_URL,
                json=test_credential.model_dump(),
                headers=(
                    user_performing_action.headers
                    if user_performing_action
                    else GENERAL_HEADERS
                ),
            )

        if response.ok:
            data = response.json()
            id = data.get("id")
            if id:
                test_credential.id = id

        return response.ok

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
