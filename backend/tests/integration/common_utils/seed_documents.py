from uuid import uuid4

import requests
from pydantic import Field

from danswer.auth.schemas import UserRole
from danswer.configs.constants import DocumentSource
from ee.danswer.server.api_key.models import APIKeyArgs
from tests.integration.common_utils.cc_pair import TestCCPair
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.constants import NUM_DOCS
from tests.integration.common_utils.test_models import SimpleTestDocument
from tests.integration.common_utils.test_models import TestUser
from tests.integration.common_utils.vespa import TestVespaClient


def _generate_dummy_document(document_id: str, cc_pair_id: int) -> dict:
    return {
        "document": {
            "id": document_id,
            "sections": [
                {
                    "text": f"This is test document {document_id}",
                    "link": f"{document_id}",
                }
            ],
            "source": DocumentSource.NOT_APPLICABLE,
            # just for testing metadata
            "metadata": {"document_id": document_id},
            "semantic_identifier": f"Test Document {document_id}",
            "from_ingestion_api": True,
        },
        "cc_pair_id": cc_pair_id,
    }


class DocumentManager:
    @staticmethod
    def add_api_key_to_user(
        user: TestUser,
        name: str | None = None,
        role: UserRole = UserRole.ADMIN,
    ) -> TestUser:
        name = f"{name}-api-key" if name else f"test-api-key-{uuid4()}"
        api_key_request = APIKeyArgs(
            name=name,
            role=role,
        )
        api_key_response = requests.post(
            f"{API_SERVER_URL}/admin/api-key",
            json=api_key_request.model_dump(),
            headers=user.headers,
        )
        api_key_response.raise_for_status()
        user.headers["Authorization"] = f"Bearer {api_key_response.json()['api_key']}"
        return user

    @staticmethod
    def seed_and_attach_docs(
        cc_pair: TestCCPair,
        num_docs: int = NUM_DOCS,
        document_ids: list[str] | None = None,
        user_with_api_key: TestUser | None = None,
    ) -> TestCCPair:
        # Use provided document_ids if available, otherwise generate random UUIDs
        if document_ids is None:
            document_ids = [f"test-doc-{uuid4()}" for _ in range(num_docs)]
        else:
            num_docs = len(document_ids)
        # Create and ingest some documents
        documents: list[dict] = []
        for document_id in document_ids:
            document = _generate_dummy_document(document_id, cc_pair.id)
            documents.append(document)
            response = requests.post(
                f"{API_SERVER_URL}/danswer-api/ingestion",
                json=document,
                headers=user_with_api_key.headers
                if user_with_api_key
                else GENERAL_HEADERS,
            )
            response.raise_for_status()

        print("Seeding completed successfully.")
        cc_pair.documents = [
            SimpleTestDocument(
                id=document["document"]["id"],
                content=document["document"]["sections"][0]["text"],
            )
            for document in documents
        ]
        return cc_pair

    @staticmethod
    def verify(
        vespa_client: TestVespaClient,
        cc_pair: TestCCPair,
        doc_set_names: list[str] = Field(default_factory=list),
        group_names: list[str] = Field(default_factory=list),
        doc_creating_user: TestUser | None = None,
        verify_deleted: bool = False,
    ) -> bool:
        doc_ids = [document.id for document in cc_pair.documents]
        retrieved_docs_dict = vespa_client.get_documents_by_id(doc_ids)["documents"]
        retrieved_docs = {
            doc["fields"]["document_id"]: doc["fields"] for doc in retrieved_docs_dict
        }

        for document in cc_pair.documents:
            retrieved_doc = retrieved_docs.get(document.id)
            if not retrieved_doc:
                if not verify_deleted:
                    print(f"Document not found: {document.id}")
                    return False
                continue
            if verify_deleted:
                return False

            acl_keys = set(retrieved_doc["access_control_list"].keys())
            expected_acl_keys = set()
            if cc_pair.is_public:
                expected_acl_keys.add("PUBLIC")
            if doc_creating_user:
                expected_acl_keys.add(f"user_id:{doc_creating_user.id}")
            for group_name in group_names:
                expected_acl_keys.add(f"group:{group_name}")
            if acl_keys != expected_acl_keys:
                print(f"Access control list keys: {acl_keys}")
                print(f"Expected keys: {expected_acl_keys}")
                return False

            found_doc_set_names = set(retrieved_doc["document_sets"].keys())
            if found_doc_set_names != set(doc_set_names):
                print(f"Found doc set names: {found_doc_set_names}")
                print(f"Expected doc set names: {doc_set_names}")
                return False

        return True
