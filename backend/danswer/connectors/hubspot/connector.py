import json
from typing import Any
from hubspot import HubSpot
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

HUBSPOT_BASE_URL = "https://app.hubspot.com/contacts/19928990/record/0-5/"
logger = setup_logger()

class HubSpotConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE, access_token: str | None = None) -> None:
        self.batch_size = batch_size
        self.access_token = access_token

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.access_token = credentials["access_token"]
        return None

    def _process_tickets(self) -> GenerateDocumentsOutput:
        if self.access_token is None:
            raise ConnectorMissingCredentialError("HubSpot")
        
        api_client = HubSpot(access_token=self.access_token)
        all_tickets = api_client.crm.tickets.get_all()

        doc_batch: list[Document] = []
        
        for ticket in all_tickets:
            title = ticket["properties"]["subject"]
            link = HUBSPOT_BASE_URL + ticket["id"]
            content_text = title + "\n" + ticket["properties"]["content"]

            doc_batch.append(
                Document(
                    id=ticket["id"],
                    sections=[Section(link=link, text=content_text)],
                    source=DocumentSource.HUBSPOT,
                    semantic_identifier=title,
                    metadata={},
                )
            )
            
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_tickets()

    def poll_source(self, start: int, end: int) -> GenerateDocumentsOutput:
        # Currently, we're loading all tickets. Adjust this method if HubSpot provides a way to load tickets by date range.
        return self._process_tickets()



if __name__ == "__main__":
    import time
    test_connector = HubSpotConnector()
    test_connector.load_credentials({
        "access_token": "pat-na1-1e4f54a5-5e68-4e6a-a03e-e8f14c37835d"
    })
    all_docs = test_connector.load_from_state()
    
    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 day
    latest_docs = test_connector.poll_source(one_day_ago, current)
    print(latest_docs)


