import uuid

import requests
from pydantic import BaseModel

from danswer.auth.schemas import UserRole
from danswer.configs.constants import DocumentSource
from ee.danswer.server.api_key.models import APIKeyArgs
from tests.integration.common_utils.connectors import ConnectorClient
from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.constants import GENERAL_HEADERS
from tests.integration.common_utils.user import TestUser


class SimpleTestDocument(BaseModel):
    id: str
    content: str


class SeedDocumentResponse(BaseModel):
    cc_pair_id: int
    documents: list[SimpleTestDocument]


class TestDocumentManager:
    @staticmethod
    def get_api_key(
        name: str | None = None,
        role: UserRole = UserRole.ADMIN,
        user_performing_action: TestUser | None = None,
    ) -> str:
        api_key_request = APIKeyArgs(
            name=name,
            role=role,
        )
        api_key_response = requests.post(
            f"{API_SERVER_URL}/admin/api-key",
            json=api_key_request.model_dump(),
            headers=user_performing_action.headers
            if user_performing_action
            else GENERAL_HEADERS,
        )
        api_key_response.raise_for_status()
        return api_key_response.json()["api_key"]

    @staticmethod
    def seed_documents(
        num_docs: int = 5,
        cc_pair_id: int | None = None,
        user_performing_action: TestUser | None = None,
        api_key: str | None = None,
    ) -> SeedDocumentResponse:
        if not cc_pair_id:
            connector_details = ConnectorClient.create_connector()
            cc_pair_id = connector_details.cc_pair_id

        # Create and ingest some documents
        documents: list[dict] = []
        for _ in range(num_docs):
            document_id = f"test-doc-{uuid.uuid4()}"
            document = {
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
            documents.append(document)
            response = requests.post(
                f"{API_SERVER_URL}/danswer-api/ingestion",
                json=document,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()

        print("Seeding completed successfully.")
        return SeedDocumentResponse(
            cc_pair_id=cc_pair_id,
            documents=[
                SimpleTestDocument(
                    id=document["document"]["id"],
                    content=document["document"]["sections"][0]["text"],
                )
                for document in documents
            ],
        )


if __name__ == "__main__":
    seed_documents_resp = TestDocumentManager.seed_documents()
