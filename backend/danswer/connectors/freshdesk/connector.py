import requests
import json
from datetime import datetime, timezone
from typing import Any, List, Optional, Iterator
from danswer.file_processing.html_utils import parse_html_page_basic
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput, SecondsSinceUnixEpoch
from danswer.connectors.interfaces import PollConnector, LoadConnector
from danswer.connectors.models import ConnectorMissingCredentialError, Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

def _create_doc_from_ticket(ticket: dict, domain: str) -> Document:
    # Process date fields
    for date_field in ["created_at", "updated_at", "due_by"]:
        ticket[date_field] = datetime.fromisoformat(ticket[date_field].rstrip('Z')).replace(tzinfo=timezone.utc)

    # Convert all other values to strings
    ticket = {
        key: str(value) if not isinstance(value, (str, datetime)) else value
        for key, value in ticket.items()
    }

    # Checking for overdue tickets
    ticket["overdue"] = datetime.now(timezone.utc) > ticket["due_by"]

    # Map ticket status codes to human readable values
    status_mapping = {2: "open", 3: "pending", 4: "resolved", 5: "closed"}
    if status_string := status_mapping.get(ticket.get("status")):
        ticket["status"] = status_string

    # Parse HTML from the description field
    ticket["description"] = parse_html_page_basic(ticket["description"])

    return Document(
        id=ticket["id"],
        sections=[Section(
            link=f"https://{domain}.freshdesk.com/helpdesk/tickets/{int(ticket['id'])}",
            text=json.dumps({
                key: value
                for key, value in ticket.items()
                if isinstance(value, str)
            }, default=str),
        )],
        source=DocumentSource.FRESHDESK,
        semantic_identifier=ticket["subject"],
        metadata={
            key: value.isoformat() if isinstance(value, datetime) else str(value)
            for key, value in ticket.items()
            if isinstance(value, (str, datetime)) and key not in ["description", "description_text"]
        },
    )

class FreshdeskConnector(PollConnector, LoadConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.api_key = credentials.get("freshdesk_api_key")
        self.domain = credentials.get("freshdesk_domain")
        self.password = credentials.get("freshdesk_password")
        return None
    
    def _fetch_tickets(self, start: datetime | None = None, end: datetime | None = None) -> Iterator[List[dict]]:
        #"end" is not currently used, so we may double fetch tickets created after the indexing starts but before the actual call is made. 
        #To use "end" would require us to use the search endpoint but it has limitations, 
        #namely having to fetch all IDs and then individually fetch each ticket because there is no "include" field available for this endpoint:
        #https://developers.freshdesk.com/api/#filter_tickets
        if any([self.api_key, self.domain, self.password]) is None:
            raise ConnectorMissingCredentialError("freshdesk")
        
        base_url = f"https://{self.domain}.freshdesk.com/api/v2/tickets"
        params = {
            "include": "description",
            "per_page": 50,
            "page": 1
        }
        
        if start:
            params["updated_since"] = start.isoformat()

        while True:
            response = requests.get(base_url, auth=(self.api_key, self.password), params=params)
            response.raise_for_status()
            
            if response.status_code == 204:
                break
            
            tickets = json.loads(response.content)
            logger.info(f"Fetched {len(tickets)} tickets from Freshdesk API (Page {params['page']})")

            yield tickets

            if len(tickets) < params["per_page"]:
                break
            
            params["page"] += 1

    def _process_tickets(self, start: datetime | None = None, end: datetime | None = None) -> GenerateDocumentsOutput:
        doc_batch: List[Document] = []

        for ticket_batch in self._fetch_tickets(start, end):
            for ticket in ticket_batch:
                doc_batch.append(_create_doc_from_ticket(ticket, self.domain))

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_tickets()

    def poll_source(self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)

        yield from self._process_tickets(start_datetime, end_datetime)
