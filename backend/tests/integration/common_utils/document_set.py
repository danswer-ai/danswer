from uuid import UUID
from uuid import uuid4

import requests
from pydantic import BaseModel
from pydantic import Field
from requests import Response

from danswer.server.features.document_set.models import DocumentSet
from danswer.server.features.document_set.models import DocumentSetCreationRequest
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser


class TestDocumentSet(BaseModel):
    id: int | None = None
    doc_set_creation_request: DocumentSetCreationRequest


class DocumentSetManager:
    @staticmethod
    def build_test_user_group(
        name: str | None = None,
        description: str | None = None,
        cc_pair_ids: list[int] = Field(default_factory=list),
        is_public: bool = True,
        users: list[UUID] = Field(default_factory=list),
        groups: list[int] = Field(default_factory=list),
    ) -> TestDocumentSet:
        if name is None:
            name = f"test_doc_set_{str(uuid4())}"
        user_group_creation_request = DocumentSetCreationRequest(
            name=name,
            description=description or name,
            cc_pair_ids=cc_pair_ids,
            is_public=is_public,
            users=users,
            groups=groups,
        )
        return TestDocumentSet(
            doc_set_creation_request=user_group_creation_request,
        )

    @staticmethod
    def send_document_set(
        doc_set_creation_request: DocumentSetCreationRequest,
        user_performing_action: TestUser | None = None,
    ) -> Response:
        return requests.post(
            f"{API_SERVER_URL}/manage/admin/document-set",
            json=doc_set_creation_request.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )

    @staticmethod
    def fetch_document_sets(
        user_performing_action: TestUser | None = None,
    ) -> list[DocumentSet]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/document-set",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

        document_sets = [
            DocumentSet.model_validate(doc_set_data) for doc_set_data in response.json()
        ]
        return document_sets
