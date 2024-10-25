import requests
import json
from datetime import datetime
from typing import Any, List, Optional
from danswer.file_processing.html_utils import parse_html_page_basic
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput, PollConnector, LoadConnector, SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError, Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class FreshdeskConnector(PollConnector, LoadConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size

    def ticket_link(self, tid: int) -> str:
        return f"https://{self.domain}.freshdesk.com/helpdesk/tickets/{tid}"

    def build_doc_sections_from_ticket(self, ticket: dict) -> List[Section]:
        # Use list comprehension for building sections
        return [
            Section(
                link=self.ticket_link(int(ticket["id"])),
                text=json.dumps({
                    key: value
                    for key, value in ticket.items()
                    if isinstance(value, str)
                }, default=str),
            )
        ]

    def strip_html_tags(self, html: str) -> str:
        return parse_html_page_basic(html)

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.api_key = credentials.get("freshdesk_api_key")
        self.domain = credentials.get("freshdesk_domain")
        self.password = credentials.get("freshdesk_password")
        return None
    
    def _fetch_tickets(self, start: datetime, end: datetime) -> List[dict]:
        if any([self.api_key, self.domain, self.password]) is None:
            raise ConnectorMissingCredentialError("freshdesk")
        
        start_time = start.strftime("%Y-%m-%dT%H:%M:%SZ")

        all_tickets = []
        page = 1
        per_page = 50

        while True:
            freshdesk_url = (
                f"https://{self.domain}.freshdesk.com/api/v2/tickets"
                f"?include=description&updated_since={start_time}"
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

    def _process_tickets(self, start: datetime, end: datetime) -> GenerateDocumentsOutput:
        tickets = self._fetch_tickets(start, end)
        doc_batch: List[Document] = []

        for ticket in tickets:
            #convert to iso format
            for date_field in ["created_at", "updated_at", "due_by"]:
                if ticket[date_field].endswith('Z'):
                    ticket[date_field] = ticket[date_field][:-1] + '+00:00'
                ticket[date_field] = datetime.fromisoformat(ticket[date_field]).strftime("%Y-%m-%d %H:%M:%S")

            #convert all other values to strings
            ticket = {
                key: str(value) if not isinstance(value, str) else value
                for key, value in ticket.items()
            }

            # Checking for overdue tickets
            today = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ticket["overdue"] = "true" if today > ticket["due_by"] else "false"

            # Mapping the status field values
            status_mapping = {2: "open", 3: "pending", 4: "resolved", 5: "closed"}
            ticket["status"] = status_mapping.get(ticket["status"], str(ticket["status"]))

            # Stripping HTML tags from the description field
            ticket["description"] = self.strip_html_tags(ticket["description"])

            # Remove extra white spaces from the description field
            ticket["description"] = " ".join(ticket["description"].split())

            # Use list comprehension for building sections
            sections = self.build_doc_sections_from_ticket(ticket)

            created_at = datetime.fromisoformat(ticket["created_at"])
            if start <= created_at <= end:
                doc = Document(
                    id=ticket["id"],
                    sections=sections,
                    source=DocumentSource.FRESHDESK,
                    semantic_identifier=ticket["subject"],
                    metadata={
                        key: value
                        for key, value in ticket.items()
                        if isinstance(value, str) and key not in ["description", "description_text"]
                    },
                )
                doc_batch.append(doc)

            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_tickets()

    def poll_source(self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start)
        end_datetime = datetime.fromtimestamp(end)

        yield from self._process_tickets(start_datetime, end_datetime)
