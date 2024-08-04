import uuid
from typing import cast

import requests
from pydantic import BaseModel

from danswer.configs.constants import DocumentSource
from tests.integration.common.constants import API_SERVER_URL


class SeedDocumentResponse(BaseModel):
    cc_pair_id: int
    document_ids: list[str]


class TestDocumentClient:
    @staticmethod
    def seed_documents(num_docs: int = 5) -> SeedDocumentResponse:
        unique_id = uuid.uuid4()

        # Create a connector
        connector_name = f"test_connector_{unique_id}"
        connector_data = {
            "name": connector_name,
            "source": DocumentSource.NOT_APPLICABLE,
            "input_type": "load_state",
            "connector_specific_config": {},
            "refresh_freq": 60,
            "disabled": False,
        }
        response = requests.post(
            f"{API_SERVER_URL}/manage/admin/connector",
            json=connector_data,
        )
        response.raise_for_status()
        connector_id = response.json()["id"]

        # Associate the credential with the connector
        cc_pair_metadata = {"name": f"test_cc_pair_{unique_id}", "is_public": True}
        response = requests.put(
            f"{API_SERVER_URL}/manage/connector/{connector_id}/credential/0",
            json=cc_pair_metadata,
        )
        response.raise_for_status()
        cc_pair_id = cast(int, response.json()["data"])

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
