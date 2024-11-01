from base64 import urlsafe_b64decode
from typing import Any
from typing import Dict

from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from googleapiclient.discovery import Resource  # type: ignore

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.google.google_auth import get_google_creds
from danswer.connectors.cross_connector_utils.google.google_utils import (
    execute_paginated_retrieval,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import USER_FIELDS
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

MESSAGE_FIELDS = "messages(id, payload(headers, parts(body(data), mimeType), parts(body(data), mimeType)))"


def _build_time_range_query(
    time_range_start: SecondsSinceUnixEpoch | None = None,
    time_range_end: SecondsSinceUnixEpoch | None = None,
) -> str | None:
    query = ""
    if time_range_start is not None and time_range_start != 0:
        query += f"after:{int(time_range_start)}"
    if time_range_end is not None and time_range_end != 0:
        query += f" before:{int(time_range_end)}"
    query = query.strip()

    if len(query) == 0:
        return None

    return query


def _get_email_body(payload: dict[str, Any]) -> str:
    parts = payload.get("parts", [])
    email_body = ""
    for part in parts:
        mime_type = part.get("mimeType")
        body = part.get("body")
        if mime_type == "text/plain":
            data = body.get("data", "")
            text = urlsafe_b64decode(data).decode()
            email_body += text
    return email_body


def email_to_document(full_email: Dict[str, Any]) -> Document:
    email_id = full_email["id"]
    payload = full_email["payload"]
    headers = payload.get("headers")
    labels = full_email.get("labelIds", [])
    metadata = {}
    if headers:
        for header in headers:
            name = header.get("name").lower()
            value = header.get("value")
            if name in ["from", "to", "subject", "date", "cc", "bcc"]:
                metadata[name] = value
    email_data = ""
    for name, value in metadata.items():
        email_data += f"{name}: {value}\n"
    metadata["labels"] = labels
    logger.debug(f"{email_data}")
    email_body_text: str = _get_email_body(payload)
    date_str = metadata.get("date")
    email_updated_at = time_str_to_utc(date_str) if date_str else None
    link = f"https://mail.google.com/mail/u/0/#inbox/{email_id}"
    return Document(
        id=email_id,
        sections=[Section(link=link, text=email_data + email_body_text)],
        source=DocumentSource.GMAIL,
        title=metadata.get("subject"),
        semantic_identifier=metadata.get("subject", "Untitled Email"),
        doc_updated_at=email_updated_at,
        metadata=metadata,
    )


class GmailConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size

        self.creds: OAuthCredentials | ServiceAccountCredentials | None = None
        self.google_domain: str | None = None
        self.primary_admin_email: str | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, str] | None:
        primary_admin_email = credentials[DB_CREDENTIALS_PRIMARY_ADMIN_KEY]
        self.google_domain = primary_admin_email.split("@")[1]
        self.primary_admin_email = primary_admin_email

        self.creds, new_creds_dict = get_google_creds(
            credentials=credentials,
            source=DocumentSource.GMAIL,
        )
        return new_creds_dict

    def get_google_resource(
        self,
        service_name: str = "gmail",
        service_version: str = "v1",
        user_email: str | None = None,
    ) -> Resource:
        if isinstance(self.creds, ServiceAccountCredentials):
            creds = self.creds.with_subject(user_email or self.primary_admin_email)
            service = build(service_name, service_version, credentials=creds)
        elif isinstance(self.creds, OAuthCredentials):
            service = build(service_name, service_version, credentials=self.creds)
        else:
            raise PermissionError("No credentials found")

        return service

    def _get_all_user_emails(self) -> list[str]:
        admin_service = self.get_google_resource("admin", "directory_v1")
        emails = []
        for user in execute_paginated_retrieval(
            retrieval_function=admin_service.users().list,
            list_key="users",
            fields=USER_FIELDS,
            domain=self.google_domain,
        ):
            if email := user.get("primaryEmail"):
                emails.append(email)
        return emails

    def _fetch_mails_from_gmail(
        self,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        if self.creds is None:
            raise PermissionError("Not logged into Gmail")
        _build_time_range_query(time_range_start, time_range_end)
        service = self.get_google_resource()
        # for file in execute_paginated_retrieval(
        #     retrieval_function=service.messages().list,
        #     list_key="messages",
        #     fields="messages(id, payload(headers, parts(body(data), mimeType), parts(body(data), mimeType)))",
        #     q=query,
        # ):
        #     yield file
        doc_batch = []
        for user_email in self._get_all_user_emails():
            service = self.get_google_resource(user_email=user_email)
            for message in execute_paginated_retrieval(
                retrieval_function=service.users().messages().list,
                list_key="messages",
                userId=user_email,
                fields="*",
            ):
                doc_batch.append(email_to_document(message))
            if len(doc_batch) > 0:
                yield doc_batch
                doc_batch = []
        # while page_token is not None:
        #     result = _execute_with_retry(
        #         service.users()
        #         .messages()
        #         .list(
        #             userId="me",
        #             pageToken=page_token,
        #             q=query,
        #             maxResults=self.batch_size,
        #         )
        #     )

        #     page_token = result.get("nextPageToken")
        #     messages = result.get("messages", [])
        #     doc_batch = []
        #     for message in messages:
        #         message_id = message["id"]
        #         msg = _execute_with_retry(
        #             service.users()
        #             .messages()
        #             .get(userId="me", id=message_id, format="full")
        #         )
        #         doc = _email_to_document(msg)
        #         doc_batch.append(doc)
        #     if len(doc_batch) > 0:
        #         yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._fetch_mails_from_gmail()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        yield from self._fetch_mails_from_gmail(start, end)


if __name__ == "__main__":
    pass
