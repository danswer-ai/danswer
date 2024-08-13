import uuid

import requests
from pydantic import BaseModel

from danswer.configs.constants import DocumentSource
from tests.integration.common.connectors import ConnectorClient
from tests.integration.common.constants import API_SERVER_URL


class SeedDocumentResponse(BaseModel):
    cc_pair_id: int
    document_ids: list[str]


class TestDocumentClient:
    @staticmethod
    def seed_documents(
        num_docs: int = 5, cc_pair_id: int | None = None
    ) -> SeedDocumentResponse:
        if not cc_pair_id:
            connector_details = ConnectorClient.create_connector()
            cc_pair_id = connector_details.cc_pair_id

        # Create and ingest some documents
        document_ids: list[str] = []
        for _ in range(num_docs):
            document_id = f"test-doc-{uuid.uuid4()}"
            document_ids.append(document_id)

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
                    "metadata": {},
                    "semantic_identifier": f"Test Document {document_id}",
                    "from_ingestion_api": True,
                },
                "cc_pair_id": cc_pair_id,
            }
            response = requests.post(
                f"{API_SERVER_URL}/danswer-api/ingestion",
                json=document,
            )
            response.raise_for_status()

        print("Seeding completed successfully.")
        return SeedDocumentResponse(
            cc_pair_id=cc_pair_id,
            document_ids=document_ids,
        )


if __name__ == "__main__":
    seed_documents_resp = TestDocumentClient.seed_documents()
