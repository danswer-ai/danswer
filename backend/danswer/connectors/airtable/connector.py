import json
from typing import Any

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from pyairtable import Api as AirtableApi


class AirtableClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__("Airtable Client is not set up, was load_credentials called?")


class AirtableConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        base_id: str,
        table_name_or_id: str,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.base_id = base_id
        self.table_name_or_id = table_name_or_id
        self.batch_size = batch_size
        self.airtable_client: AirtableApi | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.airtable_client = AirtableApi(credentials["airtable_access_token"])

        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        if not self.airtable_client:
            raise AirtableClientNotSetUpError()

        table = self.airtable_client.table(self.base_id, self.table_name_or_id)
        all_records = table.all()

        record_documents = []
        for record in all_records:
            record_document = Document(
                id=str(record.get("id")),
                sections=[
                    Section(
                        link=f"https://airtable.com/{self.base_id}/{self.table_name_or_id}/",
                        text=json.dumps(record.get("fields")),
                    )
                ],
                source=DocumentSource.AIRTABLE,
                semantic_identifier=f"Airtable Base ID: {self.base_id}. Table Name (or id): {self.table_name_or_id}",
                metadata={
                    "type": "airtable",
                    "created_time": record.get("createdTime"),
                },
            )
            record_documents.append(record_document)

        yield record_documents

    def load_from_state(self) -> GenerateDocumentsOutput:
        if not self.airtable_client:
            raise AirtableClientNotSetUpError()
        return self.poll_source(None, None)
