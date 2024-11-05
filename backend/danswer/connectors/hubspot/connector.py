from datetime import datetime
from datetime import timezone
from typing import Any

import requests
from hubspot import HubSpot  # type: ignore

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

HUBSPOT_BASE_URL = "https://app.hubspot.com/contacts/"
HUBSPOT_API_URL = "https://api.hubapi.com/integrations/v1/me"

logger = setup_logger()


class HubSpotConnector(LoadConnector, PollConnector):
    def __init__(
        self, batch_size: int = INDEX_BATCH_SIZE, access_token: str | None = None
    ) -> None:
        self.batch_size = batch_size
        self.access_token = access_token
        self.portal_id: str | None = None
        self.ticket_base_url = HUBSPOT_BASE_URL

    def get_portal_id(self) -> str:
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
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

    def _process_all_notes(
        self, api_client: HubSpot, start: datetime | None = None, end: datetime | None = None
    ) -> list[Document]:
        """Fetch all notes from HubSpot"""
        note_docs: list[Document] = []
        
        # Use pagination to get all notes
        after = None
        while True:
            response = api_client.crm.objects.notes.basic_api.get_page(
                properties=["hs_body_preview", "hs_created_by", "hs_note_body"],
                after=after,
                limit=100
            )
            
            if not response.results:
                break
                
            for note in response.results:
                if not note.properties.get("hs_body_preview"):
                    continue
                    
                updated_at = note.updated_at.replace(tzinfo=None)
                if start is not None and updated_at < start:
                    continue
                if end is not None and updated_at > end:
                    continue

                content_text = note.properties.get("hs_note_body", note.properties["hs_body_preview"])
                creator = note.properties.get("hs_created_by")
                creator_str = str(creator) if creator is not None else "Unknown"
                
                note_docs.append(
                    Document(
                        id=f"note_{note.id}",
                        sections=[Section(link=f"{self.ticket_base_url}", text=content_text)],
                        source=DocumentSource.HUBSPOT,
                        semantic_identifier=f"Note by {creator_str}",
                        doc_updated_at=note.updated_at.replace(tzinfo=timezone.utc),
                        metadata={"type": "note", "creator": [creator_str]},  # Wrap creator in a list
                    )
                )
            
            if not response.paging:
                break
                
            after = response.paging.next.after

        return note_docs

    def _process_tickets(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.access_token is None:
            raise ConnectorMissingCredentialError("HubSpot")

        api_client = HubSpot(access_token=self.access_token)
        
        # Get all standalone notes first
        doc_batch = self._process_all_notes(api_client, start, end)
        
        # Then process tickets with pagination
        after = None
        while True:
            response = api_client.crm.tickets.basic_api.get_page(
                associations=["contacts", "notes"],
                after=after,
                limit=100
            )
            
            if not response.results:
                break
                
            for ticket in response.results:
                updated_at = ticket.updated_at.replace(tzinfo=None)
                if start is not None and updated_at < start:
                    continue
                if end is not None and updated_at > end:
                    continue

                title = ticket.properties.get("subject") or "Untitled Ticket"
                link = self.ticket_base_url + ticket.id
                content_text = ticket.properties.get("content", "")

                associated_emails: list[str] = []
                associated_notes: list[str] = []

                if ticket.associations:
                    contacts = ticket.associations.get("contacts")
                    notes = ticket.associations.get("notes")

                    if contacts:
                        for contact in contacts.results:
                            contact = api_client.crm.contacts.basic_api.get_by_id(
                                contact_id=contact.id
                            )
                            associated_emails.append(contact.properties["email"])

                    if notes:
                        for note in notes.results:
                            note = api_client.crm.objects.notes.basic_api.get_by_id(
                                note_id=note.id, properties=["content", "hs_body_preview"]
                            )
                            if note.properties["hs_body_preview"] is None:
                                continue
                            associated_notes.append(note.properties["hs_body_preview"])

                # Filter out None values and ensure strings
                associated_emails_str = " ,".join(filter(None, (str(email) for email in associated_emails)))
                associated_notes_str = " ".join(filter(None, (str(note) for note in associated_notes)))

                content_text = (content_text or "").strip()
                content_text = f"{content_text}\n emails: {associated_emails_str} \n notes: {associated_notes_str}"

                doc_batch.append(
                    Document(
                        id=ticket.id,
                        sections=[Section(link=link, text=content_text)],
                        source=DocumentSource.HUBSPOT,
                        semantic_identifier=title,
                        # Is already in tzutc, just replacing the timezone format
                        doc_updated_at=ticket.updated_at.replace(tzinfo=timezone.utc),
                        metadata={},
                    )
                )

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []
            
            if not response.paging:
                break
                
            after = response.paging.next.after

        # Yield any remaining documents
        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_tickets()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._process_tickets(start_datetime, end_datetime)


if __name__ == "__main__":
    import os

    connector = HubSpotConnector()
    connector.load_credentials(
        {"hubspot_access_token": os.environ["HUBSPOT_ACCESS_TOKEN"]}
    )

    document_batches = connector.load_from_state()
    print(next(document_batches))
