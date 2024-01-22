from base64 import urlsafe_b64decode
from typing import Any
from typing import cast
from typing import Dict
from typing import Optional

from google.auth.credentials import Credentials  # type: ignore
from googleapiclient import discovery  # type: ignore

from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.gmail.connector_auth import (
    get_gmail_creds_for_authorized_user,
)
from danswer.connectors.gmail.connector_auth import (
    get_gmail_creds_for_service_account,
)
from danswer.connectors.gmail.constants import (
    DB_CREDENTIALS_DICT_DELEGATED_USER_KEY,
)
from danswer.connectors.gmail.constants import DB_CREDENTIALS_DICT_TOKEN_KEY
from danswer.connectors.gmail.constants import (
    GMAIL_DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY,
)
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

# allow 10 minutes for modifiedTime to get propagated
GMAIL_START_TIME_OFFSET = 60 * 10


class GmailConnector(LoadConnector, PollConnector):
    def __init__(self) -> None:
        self.creds: Credentials | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, str] | None:
        """Checks for two different types of credentials.
        (1) A credential which holds a token acquired via a user going thorugh
        the Google OAuth flow.
        (2) A credential which holds a service account key JSON file, which
        can then be used to impersonate any user in the workspace.
        """
        creds = None
        new_creds_dict = None
        if DB_CREDENTIALS_DICT_TOKEN_KEY in credentials:
            access_token_json_str = cast(
                str, credentials[DB_CREDENTIALS_DICT_TOKEN_KEY]
            )
            creds = get_gmail_creds_for_authorized_user(
                token_json_str=access_token_json_str
            )

            # tell caller to update token stored in DB if it has changed
            # (e.g. the token has been refreshed)
            new_creds_json_str = creds.to_json() if creds else ""
            if new_creds_json_str != access_token_json_str:
                new_creds_dict = {DB_CREDENTIALS_DICT_TOKEN_KEY: new_creds_json_str}

        if GMAIL_DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY in credentials:
            service_account_key_json_str = credentials[
                GMAIL_DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY
            ]
            creds = get_gmail_creds_for_service_account(
                service_account_key_json_str=service_account_key_json_str
            )

            # "Impersonate" a user if one is specified
            delegated_user_email = cast(
                str | None, credentials.get(DB_CREDENTIALS_DICT_DELEGATED_USER_KEY)
            )
            if delegated_user_email:
                creds = creds.with_subject(delegated_user_email) if creds else None

        if creds is None:
            raise PermissionError(
                "Unable to access Gmail - unknown credential structure."
            )

        self.creds = creds
        return new_creds_dict

    def _get_email_body(self, payload) -> str:
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

    def _email_to_document(self, full_email: Dict[str, Any]) -> Document:
        email_id = full_email.get("id")
        payload = full_email.get("payload")
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
        email_body_text: str = self._get_email_body(payload)
        email_updated_at = time_str_to_utc(metadata.get("date"))
        link = f"https://mail.google.com/mail/u/0/#inbox/{email_id}"
        return Document(
            id=email_id,
            sections=[Section(link=link, text=email_data + email_body_text)],
            source=DocumentSource.GMAIL,
            title=metadata.get("subject"),
            semantic_identifier=metadata.get("subject"),
            doc_updated_at=email_updated_at,
            metadata=metadata,
        )

    @staticmethod
    def _build_time_range_query(
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> Optional[str]:
        query = ""
        if time_range_start is not None and time_range_start != 0:
            query += f"after:{int(time_range_start)}"
        if time_range_end is not None and time_range_end != 0:
            query += f" before:{int(time_range_end)}"
        query = query.strip()
        if len(query) == 0:
            query = None
        return query

    def _fetch_mails_from_gmail(
        self,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        if self.creds is None:
            raise PermissionError("Not logged into Gmail")
        page_token = ""
        query = GmailConnector._build_time_range_query(time_range_start, time_range_end)
        service = discovery.build("gmail", "v1", credentials=self.creds)
        while page_token is not None:
            result = (
                service.users()
                .messages()
                .list(userId="me", pageToken=page_token, q=query)
                .execute()
            )
            page_token = result.get("nextPageToken")
            messages = result.get("messages", [])
            doc_batch = []
            for message in messages:
                message_id = message["id"]
                msg = (
                    service.users()
                    .messages()
                    .get(userId="me", id=message_id, format="full")
                    .execute()
                )
                doc = self._email_to_document(msg)
                doc_batch.append(doc)
            if len(doc_batch) > 0:
                yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._fetch_mails_from_gmail()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        # need to subtract 10 minutes from start time to account for modifiedTime
        # propogation if a document is modified, it takes some time for the API to
        # reflect these changes if we do not have an offset, then we may "miss" the
        # update when polling
        yield from self._fetch_mails_from_gmail(
            max(start - GMAIL_START_TIME_OFFSET, 0, 0), end
        )


if __name__ == "__main__":
    import json
    import os

    # TODO: pull the json from Postgres (creds table)

    service_account_json_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY_JSON_PATH")
    if not service_account_json_path:
        raise ValueError(
            "Please set GOOGLE_SERVICE_ACCOUNT_KEY_JSON_PATH environment variable"
        )
    with open(service_account_json_path) as f:
        creds = json.load(f)

    credentials_dict = {
        DB_CREDENTIALS_DICT_TOKEN_KEY: json.dumps(creds),
    }
    delegated_user = os.environ.get("GMAIL_DELEGATED_USER")
    if delegated_user:
        credentials_dict[DB_CREDENTIALS_DICT_DELEGATED_USER_KEY] = delegated_user

    connector = GmailConnector()
    # connector.load_credentials(credentials_dict)
    connector.load_credentials(
        json.loads(credentials_dict[DB_CREDENTIALS_DICT_TOKEN_KEY])
    )
    document_batch_generator = connector.load_from_state()
    for document_batch in document_batch_generator:
        print(document_batch)
        break
