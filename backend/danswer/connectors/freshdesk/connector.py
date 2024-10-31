import requests
import json
from datetime import datetime, timezone
from typing import List, Iterator
from danswer.file_processing.html_utils import parse_html_page_basic
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput, SecondsSinceUnixEpoch
from danswer.connectors.interfaces import PollConnector, LoadConnector
from danswer.connectors.models import ConnectorMissingCredentialError, Document, Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _create_metadata_from_ticket(ticket: dict) -> dict:
    included_fields = {
        "fr_escalated",
        "spam",
        "priority",
        "source",
        "status",
        "type",
        "is_escalated",
        "tags",
        "nr_due_by",
        "nr_escalated",
        "cc_emails",
        "fwd_emails",
        "reply_cc_emails",
        "ticket_cc_emails",
        "support_email",
        "to_emails",
    }

    metadata = {}
    email_data = {}

    for key, value in ticket.items():
        if (
            key in included_fields
            and value is not None
            and value != []
            and value != {}
            and value != "[]"
            and value != ""
        ):
            value_to_str = (
                [str(item) for item in value] if isinstance(value, List) else str(value)
            )
            if "email" in key:
                email_data[key] = value_to_str
            else:
                metadata[key] = value_to_str

    if email_data:
        metadata["email_data"] = str(email_data)

    # Convert source to human-parsable string
    source_types = {
        "1": "Email",
        "2": "Portal",
        "3": "Phone",
        "7": "Chat",
        "9": "Feedback Widget",
        "10": "Outbound Email",
    }
    if ticket.get("source"):
        metadata["source"] = source_types.get(
            str(ticket.get("source")), "Unknown Source Type"
        )

    # Convert priority to human-parsable string
    priority_types = {"1": "low", "2": "medium", "3": "high", "4": "urgent"}
    if ticket.get("priority"):
        metadata["priority"] = priority_types.get(
            str(ticket.get("priority")), "Unknown Priority"
        )

    # Convert status to human-parsable string
    status_types = {"2": "open", "3": "pending", "4": "resolved", "5": "closed"}
    if ticket.get("status"):
        metadata["status"] = status_types.get(
            str(ticket.get("status")), "Unknown Status"
        )

    due_by = datetime.fromisoformat(ticket["due_by"].replace("Z", "+00:00"))
    metadata["overdue"] = str(datetime.now(timezone.utc) > due_by)

    return metadata


def _create_doc_from_ticket(ticket: dict, domain: str) -> Document:
    return Document(
        id=str(ticket["id"]),
        sections=[
            Section(
                link=f"https://{domain}.freshdesk.com/helpdesk/tickets/{int(ticket['id'])}",
                text=f"description: {parse_html_page_basic(ticket.get('description_text', ''))}",
            )
        ],
        source=DocumentSource.FRESHDESK,
        semantic_identifier=ticket["subject"],
        metadata=_create_metadata_from_ticket(ticket),
        doc_updated_at=datetime.fromisoformat(
            ticket["updated_at"].replace("Z", "+00:00")
        ),
    )


class FreshdeskConnector(PollConnector, LoadConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, str | int]) -> None:
        api_key = credentials.get("freshdesk_api_key")
        domain = credentials.get("freshdesk_domain")
        password = credentials.get("freshdesk_password")

        if not all(isinstance(cred, str) for cred in [domain, api_key, password]):
            raise ConnectorMissingCredentialError(
                "All Freshdesk credentials must be strings"
            )

        self.api_key = str(api_key)
        self.domain = str(domain)
        self.password = str(password)

    def _fetch_tickets(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> Iterator[List[dict]]:
        """ 
        'end' is not currently used, so we may double fetch tickets created after the indexing
        starts but before the actual call is made.
        
        To use 'end' would require us to use the search endpoint but it has limitations,
        namely having to fetch all IDs and then individually fetch each ticket because there is no
        'include' field available for this endpoint:
        https://developers.freshdesk.com/api/#filter_tickets
        """
        if any(attr is None for attr in [self.api_key, self.domain, self.password]):
            raise ConnectorMissingCredentialError("freshdesk")

        base_url = f"https://{self.domain}.freshdesk.com/api/v2/tickets"
        params: dict[str, int | str] = {
            "include": "description",
            "per_page": 50,
            "page": 1,
        }

        if start:
            params["updated_since"] = start.isoformat()

        while True:
            response = requests.get(
                base_url, auth=(self.api_key, self.password), params=params
            )
            response.raise_for_status()

            if response.status_code == 204:
                break

            tickets = json.loads(response.content)
            logger.info(
                f"Fetched {len(tickets)} tickets from Freshdesk API (Page {params['page']})"
            )

            yield tickets

            if len(tickets) < int(params["per_page"]):
                break

            params["page"] = int(params["page"]) + 1

    def _process_tickets(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        doc_batch: List[Document] = []

        for ticket_batch in self._fetch_tickets(start, end):
            for ticket in ticket_batch:
                logger.info(_create_doc_from_ticket(ticket, self.domain))
                doc_batch.append(_create_doc_from_ticket(ticket, self.domain))

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_tickets()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)

        yield from self._process_tickets(start_datetime, end_datetime)
