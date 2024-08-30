import time
from uuid import uuid4

import requests
from pydantic import BaseModel
from pydantic import Field

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import MAX_DELAY
from tests.integration.common_utils.user import TestUser


class TestDocumentSet(BaseModel):
    id: int
    name: str
    description: str
    cc_pair_ids: list[int] = Field(default_factory=list)
    is_public: bool
    is_up_to_date: bool
    users: list[str] = Field(default_factory=list)
    groups: list[int] = Field(default_factory=list)


class DocumentSetManager:
    @staticmethod
    def create(
        name: str | None = None,
        description: str | None = None,
        cc_pair_ids: list[int] | None = None,
        is_public: bool = True,
        users: list[str] | None = None,
        groups: list[int] | None = None,
        user_performing_action: TestUser | None = None,
    ) -> TestDocumentSet:
        if name is None:
            name = f"test_doc_set_{str(uuid4())}"

        doc_set_creation_request = {
            "name": name,
            "description": description or name,
            "cc_pair_ids": cc_pair_ids or [],
            "is_public": is_public,
            "users": users or [],
            "groups": groups or [],
        }

        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/document-set",
            json=doc_set_creation_request,
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()

        return TestDocumentSet(
            id=int(response.json()),
            name=name,
            description=description or name,
            cc_pair_ids=cc_pair_ids or [],
            is_public=is_public,
            is_up_to_date=True,
            users=users or [],
            groups=groups or [],
        )

    @staticmethod
    def edit_document_set(
        document_set: TestDocumentSet,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.patch(
            f"{API_SERVER_URL}/manage/admin/document-set/{document_set.id}",
            json=document_set.model_dump(exclude={"id"}),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return True

    @staticmethod
    def delete_document_set(
        document_set: TestDocumentSet,
        user_performing_action: TestUser | None = None,
    ) -> bool:
        response = requests.delete(
            f"{API_SERVER_URL}/manage/admin/document-set/{document_set.id}",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return True

    @staticmethod
    def get_all_document_sets(
        user_performing_action: TestUser | None = None,
    ) -> list[TestDocumentSet]:
        response = requests.get(
            f"{API_SERVER_URL}/manage/document-set",
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        response.raise_for_status()
        return [
            TestDocumentSet(
                id=doc_set["id"],
                name=doc_set["name"],
                description=doc_set["description"],
                cc_pair_ids=[
                    cc_pair["id"] for cc_pair in doc_set["cc_pair_descriptors"]
                ],
                is_public=doc_set["is_public"],
                is_up_to_date=doc_set["is_up_to_date"],
                users=doc_set["users"],
                groups=doc_set["groups"],
            )
            for doc_set in response.json()
        ]

    @staticmethod
    def wait_for_document_set_sync(
        user_performing_action: TestUser | None = None,
    ) -> None:
        # wait for document sets to be synced
        start = time.time()
        while True:
            doc_sets = DocumentSetManager.get_all_document_sets(user_performing_action)
            all_up_to_date = all(doc_set.is_up_to_date for doc_set in doc_sets)

            if all_up_to_date:
                break

            if time.time() - start > MAX_DELAY:
                raise TimeoutError("Document sets were not synced within the max delay")

            time.sleep(2)

    @staticmethod
    def verify_document_set_sync(
        document_set: TestDocumentSet,
        user_performing_action: TestUser | None = None,
    ) -> None:
        doc_sets = DocumentSetManager.get_all_document_sets(user_performing_action)
        for doc_set in doc_sets:
            if doc_set.id == document_set.id:
                return (
                    doc_set.name == document_set.name
                    and doc_set.cc_pair_ids == document_set.cc_pair_ids
                    and doc_set.is_public == document_set.is_public
                    and doc_set.users == document_set.users
                    and doc_set.groups == document_set.groups
                )
        return False
