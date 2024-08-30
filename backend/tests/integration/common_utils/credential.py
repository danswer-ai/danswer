from typing import Any
from uuid import uuid4

import requests
from pydantic import BaseModel

from danswer.server.documents.models import CredentialSnapshot
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser


class TestCredential(BaseModel):
    id: int
    name: str
    credential_json: dict[str, Any]
    admin_public: bool
    source: DocumentSource
    curator_public: bool
    groups: list[int]


class CredentialManager:
    @staticmethod
    def create(
        credential_json: dict[str, Any] | None = None,
        admin_public: bool = True,
        name: str | None = None,
        source: DocumentSource = DocumentSource.FILE,
        curator_public: bool = True,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestCredential:
        name = f"{name}-credential" if name else f"test-credential-{uuid4()}"

        credential_request = {
            "name": name,
            "credential_json": credential_json or {},
            "admin_public": admin_public,
            "source": source,
            "curator_public": curator_public,
            "groups": groups or [],
        }
        response = requests.post(
            url=f"{API_SERVER_URL}/manage/credential",
            json=credential_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

        response.raise_for_status()
        return TestCredential(
            id=response.json()["id"],
            name=name,
            credential_json=credential_json or {},
            admin_public=admin_public,
            source=source,
            curator_public=curator_public,
            groups=groups or [],
        )

    @staticmethod
    def edit_credential(
        credential: TestCredential,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        if not credential.id:
            raise ValueError("Credential ID is required to edit a credential")
        request = credential.model_dump(include={"name", "credential_json"})
        print(request)
        response = requests.put(
            url=f"{API_SERVER_URL}/manage/admin/credential/{credential.id}",
            json=request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok

    @staticmethod
    def delete_credential(
        credential: TestCredential,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.delete(
            url=f"{API_SERVER_URL}/manage/credential/{credential.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        return response.ok

    @staticmethod
    def get_credential(
        credential_id: int, user_performing_action: TestUser | None = None
    ) -> CredentialSnapshot:
        response = requests.get(
            url=f"{API_SERVER_URL}/manage/credential/{credential_id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return CredentialSnapshot(**response.json())

    @staticmethod
    def get_all_credentials(
        user_performing_action: TestUser | None = None,
    ) -> list[CredentialSnapshot]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/credential",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [CredentialSnapshot(**cred) for cred in response.json()]

    @staticmethod
    def verify_credential(
        test_credential: TestCredential,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        all_credentials = CredentialManager.get_all_credentials(user_performing_action)
        for credential in all_credentials:
            if credential.id == test_credential.id:
                return (
                    credential.name == test_credential.name
                    and credential.admin_public == test_credential.admin_public
                    and credential.source == test_credential.source
                    and credential.curator_public == test_credential.curator_public
                )
        return False
