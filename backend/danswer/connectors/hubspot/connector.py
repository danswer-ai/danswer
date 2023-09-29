import requests
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

HUBSPOT_BASE_URL = "https://app.hubspot.com/contacts/"
HUBSPOT_API_URL = "https://api.hubapi.com/integrations/v1/me"

logger = setup_logger()

class HubSpotConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE, access_token: str | None = None) -> None:
        self.batch_size = batch_size
        self.access_token = access_token
        self.portal_id = None
        self.ticket_base_url = HUBSPOT_BASE_URL
        
    def get_portal_id(self) -> str:
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(HUBSPOT_API_URL, headers=headers)
        if response.status_code != 200:
            raise Exception("Error fetching portal ID")

        data = response.json()
        return data["portalId"]

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.access_token = credentials["hubspot_access_token"]
        
        if self.access_token:
            self.portal_id = self.get_portal_id()
            self.ticket_base_url = f"{HUBSPOT_BASE_URL}{self.portal_id}/ticket/"

        return None

    def _process_tickets(self) -> GenerateDocumentsOutput:
        if self.access_token is None:
            raise ConnectorMissingCredentialError("HubSpot")
        
        api_client = HubSpot(access_token=self.access_token)
        all_tickets = api_client.crm.tickets.get_all(associations=['contacts', 'notes'])

        doc_batch: list[Document] = []
        
        for ticket in all_tickets:
            title = ticket.properties["subject"]
            link = self.ticket_base_url + ticket.id
            content_text = title + "\n" + ticket.properties["content"]

            associated_emails = []
            associated_notes = []

            if ticket.associations:
                contacts = ticket.associations.get("contacts")
                notes = ticket.associations.get("notes")

                if contacts:
                    for contact in contacts.results:
                        contact = api_client.crm.contacts.basic_api.get_by_id(contact_id=contact.id)
                        associated_emails.append(contact.properties["email"])

                if notes:                   
                    for note in notes.results:
                        note = api_client.crm.objects.notes.basic_api.get_by_id(note_id=note.id, properties=["content", "hs_body_preview"])
                        associated_notes.append(note.properties["hs_body_preview"])
            
            associated_emails = " ,".join(associated_emails)
            associated_notes = " ".join(associated_notes)

            content_text = f"{content_text}\n emails: {associated_emails} \n notes: {associated_notes}"

            doc_batch.append(
                Document(
                    id=ticket.id,
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
    import os
    import time
    test_connector = HubSpotConnector()
    test_connector.load_credentials({
        "hubspot_access_token": os.environ["HUBSPOT_ACCESS_TOKEN"]
    })
    all_docs = test_connector.load_from_state()
    
    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 day
    latest_docs = test_connector.poll_source(one_day_ago, current)
    print(latest_docs)


