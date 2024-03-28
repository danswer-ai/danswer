import requests
import json
from datetime import datetime, timezone
from typing import Any, List, Optional
from bs4 import BeautifulSoup  # Add this import for HTML parsing
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput, PollConnector
from danswer.connectors.models import ConnectorMissingCredentialError, Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class FreshdeskConnector(PollConnector):
    def __init__(self, api_key: str, domain: str, password: str, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.api_key = api_key
        self.domain = domain
        self.password = password
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
        soup = BeautifulSoup(html, 'html.parser')
        return soup.get_text()

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        logger.info("Loading credentials")
        self.api_key = credentials.get("freshdesk_api_key")
        self.domain = credentials.get("freshdesk_domain")
        self.password = credentials.get("freshdesk_password")
        return None

    def _process_tickets(self, start: datetime, end: datetime) -> GenerateDocumentsOutput:
        logger.info("Processing tickets")
        if any([self.api_key, self.domain, self.password]) is None:
            raise ConnectorMissingCredentialError("freshdesk")

        freshdesk_url = f"https://{self.domain}.freshdesk.com/api/v2/tickets?include=description"
        response = requests.get(freshdesk_url, auth=(self.api_key, self.password))
        response.raise_for_status()  # raises exception when not a 2xx response

        if response.status_code!= 204:
            tickets = json.loads(response.content)
            logger.info(f"Fetched {len(tickets)} tickets from Freshdesk API")
            doc_batch: List[Document] = []

            for ticket in tickets:
                # Convert the "created_at", "updated_at", and "due_by" values to ISO 8601 strings
                for date_field in ["created_at", "updated_at", "due_by"]:
                    ticket[date_field] = datetime.fromisoformat(ticket[date_field]).strftime("%Y-%m-%d %H:%M:%S")

                # Convert all other values to strings
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
                today = datetime.now()
                if (today - created_at).days / 30.4375 <= 2:
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

    def poll_source(self, start: datetime, end: datetime) -> GenerateDocumentsOutput:
        yield from self._process_tickets(start, end)