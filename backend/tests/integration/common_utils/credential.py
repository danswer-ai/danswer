import uuid
from typing import Any

import requests
from pydantic import BaseModel

from danswer.server.documents.models import CredentialBase
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser

CREATE_CREDENTIAL_URL = f"{API_SERVER_URL}/manage/credential"


class TestCredential(BaseModel):
    id: int | None = None
    last_action_successful: bool = False
    credential_base: CredentialBase | None = None

    def create(
        self,
        user_performing_action: TestUser | None = None,
        credential_json: dict[str, Any] = {},
        admin_public: bool = True,
        name: str = "",
        source: DocumentSource = DocumentSource.FILE,
        curator_public: bool = True,
        groups: list[int] = [],
    ):
        if not name:
            name = "test-credential-" + str(uuid.uuid4())
        initial_credential_base = CredentialBase(
            credential_json=credential_json,
            admin_public=admin_public,
            source=source,
            name=name,
            curator_public=curator_public,
            groups=groups,
        )

        response = requests.post(
            url=CREATE_CREDENTIAL_URL,
            json=initial_credential_base.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            self.id = response.json().get("id")
            self.credential_base = CredentialBase(**response.json().get("credential"))
            print(f"Created credential {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to create credential {self.id}")

    def edit(
        self,
        user_performing_action: TestUser | None = None,
        credential_json: dict[str, Any] | None = None,
        admin_public: bool | None = None,
        name: str | None = None,
        curator_public: bool | None = None,
        groups: list[int] | None = None,
    ):
        updated_credential_base = CredentialBase(
            credential_json=credential_json
            if credential_json
            else self.credential_base.credential_json,
            admin_public=admin_public
            if admin_public
            else self.credential_base.admin_public,
            name=name if name else self.credential_base.name,
            curator_public=curator_public
            if curator_public
            else self.credential_base.curator_public,
            groups=groups if groups else self.credential_base.groups,
        )
        response = requests.post(
            url=f"{CREATE_CREDENTIAL_URL}/{self.id}",
            json=updated_credential_base.dict(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            self.id = response.json().get("id")
            self.credential_base = updated_credential_base
            print(f"Edited credential {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to edit credential {self.id}")

    def delete(
        self,
        user_performing_action: TestUser | None = None,
    ):
        response = requests.delete(
            url=f"{CREATE_CREDENTIAL_URL}/{self.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        try:
            response.raise_for_status()
            self.last_action_successful = True
            print(f"Deleted credential {self.id}")
        except requests.HTTPError as e:
            print(e)
            self.last_action_successful = False
            print(f"Failed to delete credential {self.id}")
