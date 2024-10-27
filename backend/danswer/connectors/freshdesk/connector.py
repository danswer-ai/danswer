import requests
import json
from datetime import datetime, timezone
from typing import Any, List, Optional
from danswer.file_processing.html_utils import parse_html_page_basic
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput, PollConnector, LoadConnector, SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError, Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

def create_doc_from_ticket(ticket: dict, domain: str) -> Document:
    return Document(
        id=ticket["id"],
        sections=Section(
            link=f"https://{domain}.freshdesk.com/helpdesk/tickets/{int(ticket['id'])}",
            text=json.dumps({
                key: value
                for key, value in ticket.items()
                if isinstance(value, str)
            }, default=str),
        ),
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

    def _load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.api_key = credentials.get("freshdesk_api_key")
        self.domain = credentials.get("freshdesk_domain")
        self.password = credentials.get("freshdesk_password")
        return None
    
    def _fetch_tickets(self, start: datetime | None = None, end: datetime | None = None) -> List[dict]:
        if any([self.api_key, self.domain, self.password]) is None:
            raise ConnectorMissingCredentialError("freshdesk")
        
        start_time = start.isoformat() if start else None

        all_tickets = []
        page = 1
        per_page = 50

        while True:
            freshdesk_url = (
                f"https://{self.domain}.freshdesk.com/api/v2/tickets"
                f"?include=description{f"&updated_since={start_time}" if start_time else ""}"
                f"&per_page={per_page}&page={page}"
            )
            response = requests.get(freshdesk_url, auth=(self.api_key, self.password))
            response.raise_for_status()
            
            if response.status_code != 204:
                tickets = json.loads(response.content)
                all_tickets.extend(tickets)
                logger.info(f"Fetched {len(tickets)} tickets from Freshdesk API (Page {page})")

                if len(tickets) < per_page:
                    break
                
                page += 1
            else:
                break

        return all_tickets

    def _process_tickets(self, start: datetime | None = None, end: datetime | None = None) -> GenerateDocumentsOutput:
        tickets = self._fetch_tickets(start, end)

        doc_batch: List[Document] = []

        for ticket in tickets:
            for date_field in ["created_at", "updated_at", "due_by"]:
                ticket[date_field] = datetime.fromisoformat(ticket[date_field].rstrip('Z'))

            # Convert all other values to strings
            ticket = {
                key: str(value) if not isinstance(value, (str, datetime)) else value
                for key, value in ticket.items()
            }

            # Checking for overdue tickets
            today = datetime.now(timezone.utc)
            ticket["overdue"] = "true" if today > ticket["due_by"] else "false"

            # Mapping the status field values
            status_mapping = {2: "open", 3: "pending", 4: "resolved", 5: "closed"}
            ticket["status"] = status_mapping.get(ticket["status"], str(ticket["status"]))

            # Stripping HTML tags from the description field
            ticket["description"] = parse_html_page_basic(ticket["description"])

            # Remove extra white spaces from the description field
            ticket["description"] = " ".join(ticket["description"].split())

            doc_batch.append(create_doc_from_ticket(ticket, self.domain))

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
