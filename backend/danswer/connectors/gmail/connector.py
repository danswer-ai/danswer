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
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    MISSING_SCOPES_ERROR_STR,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    ONYX_SCOPE_INSTRUCTIONS,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    SLIM_BATCH_SIZE,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import USER_FIELDS
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import GenerateSlimDocumentOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.interfaces import SlimConnector
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.models import SlimDocument
from danswer.utils.logger import setup_logger
from danswer.utils.retry_wrapper import retry_builder


logger = setup_logger()

MESSAGE_FIELDS = "nextPageToken, messages(id, payload(headers, parts(body(data), mimeType), parts(body(data), mimeType)))"
THREAD_FIELDS = "nextPageToken, threads(id)"
SLIM_THREAD_FIELDS = "nextPageToken, threads(id)"

EMAIL_FIELDS = [
    "cc",
    "bcc",
    "from",
    "to",
]

add_retries = retry_builder(tries=50, max_delay=30)


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


def _get_message_body(payload: dict[str, Any]) -> str:
    parts = payload.get("parts", [])
    message_body = ""
    for part in parts:
        mime_type = part.get("mimeType")
        body = part.get("body")
        if mime_type == "text/plain":
            data = body.get("data", "")
            text = urlsafe_b64decode(data).decode()
            message_body += text
    return message_body


def message_to_section(message: Dict[str, Any]) -> tuple[Section, dict[str, str]]:
    link = f"https://mail.google.com/mail/u/0/#inbox/{message['id']}"

    payload = message.get("payload", {})
    headers = payload.get("headers", [])
    metadata: dict[str, Any] = {}
    for header in headers:
        name = header.get("name").lower()
        value = header.get("value")
        if name in EMAIL_FIELDS:
            metadata[name] = value
        if name == "subject":
            metadata["subject"] = value
        if name == "date":
            metadata["updated_at"] = value

    if labels := message.get("labelIds"):
        metadata["labels"] = labels

    message_data = ""
    for name, value in metadata.items():
        # updated at isnt super useful for the llm
        if name != "updated_at":
            message_data += f"{name}: {value}\n"

    message_body_text: str = _get_message_body(payload)

    return Section(link=link, text=message_body_text + message_data), metadata


def thread_to_document(full_thread: Dict[str, Any]) -> Document | None:
    all_messages = full_thread.get("messages", [])
    if not all_messages:
        return None

    sections = []
    semantic_identifier = ""
    updated_at = None
    from_emails: set[str] = set()
    other_emails: set[str] = set()
    for message in all_messages:
        section, message_metadata = message_to_section(message)
        sections.append(section)

        for name, value in message_metadata.items():
            if name in EMAIL_FIELDS:
                if name == "from":
                    from_emails.add(value)
                else:
                    other_emails.add(value)

        # If we haven't set the semantic identifier yet, set it to the subject of the first message
        if not semantic_identifier:
            semantic_identifier = message_metadata.get("subject", "")

        if message_metadata.get("updated_at"):
            updated_at = message_metadata.get("updated_at")

    updated_at_datetime = None
    if updated_at:
        updated_at_datetime = time_str_to_utc(updated_at)

    return Document(
        id=full_thread["id"],
        semantic_identifier=semantic_identifier,
        sections=sections,
        source=DocumentSource.GMAIL,
        # This is used to perform permission sync
        primary_owners=[BasicExpertInfo(email=email) for email in from_emails],
        secondary_owners=[BasicExpertInfo(email=email) for email in other_emails],
        doc_updated_at=updated_at_datetime,
        # Not adding emails to metadata because it's already in the sections
        metadata={},
    )


class GmailConnector(LoadConnector, PollConnector, SlimConnector):
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

    def _fetch_threads(
        self,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        query = _build_time_range_query(time_range_start, time_range_end)
        doc_batch = []
        for user_email in self._get_all_user_emails():
            gmail_service = self.get_google_resource(user_email=user_email)
            for thread in execute_paginated_retrieval(
                retrieval_function=gmail_service.users().threads().list,
                list_key="threads",
                userId=user_email,
                fields=THREAD_FIELDS,
                q=query,
            ):
                full_thread = add_retries(
                    lambda: gmail_service.users()
                    .threads()
                    .get(
                        userId=user_email,
                        id=thread["id"],
                        fields=MESSAGE_FIELDS,
                    )
                    .execute()
                )()
                doc = thread_to_document(full_thread)
                if doc is None:
                    continue
                doc_batch.append(doc)
                if len(doc_batch) > self.batch_size:
                    yield doc_batch
                    doc_batch = []

    def _fetch_slim_threads(
        self,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        query = _build_time_range_query(time_range_start, time_range_end)
        doc_batch = []
        for user_email in self._get_all_user_emails():
            gmail_service = self.get_google_resource(user_email=user_email)
            for thread in execute_paginated_retrieval(
                retrieval_function=gmail_service.users().threads().list,
                list_key="threads",
                userId=user_email,
                fields=SLIM_THREAD_FIELDS,
                q=query,
            ):
                doc_batch.append(
                    SlimDocument(
                        id=thread["id"],
                    )
                )
                if len(doc_batch) > SLIM_BATCH_SIZE:
                    yield doc_batch
                    doc_batch = []

    def load_from_state(self) -> GenerateDocumentsOutput:
        try:
            yield from self._fetch_threads()
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        try:
            yield from self._fetch_threads(start, end)
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def retrieve_all_slim_documents(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        try:
            yield from self._fetch_slim_threads(start, end)
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e


if __name__ == "__main__":
    pass
