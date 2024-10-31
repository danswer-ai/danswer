import re
import time
from base64 import urlsafe_b64decode
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import cast
from typing import Dict

from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore
from googleapiclient import discovery  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore

from danswer.configs.app_configs import INDEX_BATCH_SIZE
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


def _execute_with_retry(request: Any) -> Any:
    max_attempts = 10
    attempt = 0

    while attempt < max_attempts:
        # Note for reasons unknown, the Google API will sometimes return a 429
        # and even after waiting the retry period, it will return another 429.
        # It could be due to a few possibilities:
        # 1. Other things are also requesting from the Gmail API with the same key
        # 2. It's a rolling rate limit so the moment we get some amount of requests cleared, we hit it again very quickly
        # 3. The retry-after has a maximum and we've already hit the limit for the day
        # or it's something else...
        try:
            return request.execute()
        except HttpError as error:
            attempt += 1

            if error.resp.status == 429:
                # Attempt to get 'Retry-After' from headers
                retry_after = error.resp.get("Retry-After")
                if retry_after:
                    sleep_time = int(retry_after)
                else:
                    # Extract 'Retry after' timestamp from error message
                    match = re.search(
                        r"Retry after (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)",
                        str(error),
                    )
                    if match:
                        retry_after_timestamp = match.group(1)
                        retry_after_dt = datetime.strptime(
                            retry_after_timestamp, "%Y-%m-%dT%H:%M:%S.%fZ"
                        ).replace(tzinfo=timezone.utc)
                        current_time = datetime.now(timezone.utc)
                        sleep_time = max(
                            int((retry_after_dt - current_time).total_seconds()),
                            0,
                        )
                    else:
                        logger.error(
                            f"No Retry-After header or timestamp found in error message: {error}"
                        )
                        sleep_time = 60

                sleep_time += 3  # Add a buffer to be safe

                logger.info(
                    f"Rate limit exceeded. Attempt {attempt}/{max_attempts}. Sleeping for {sleep_time} seconds."
                )
                time.sleep(sleep_time)

            else:
                raise

    # If we've exhausted all attempts
    raise Exception(f"Failed to execute request after {max_attempts} attempts")


class GmailConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size
        self.creds: OAuthCredentials | ServiceAccountCredentials | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, str] | None:
        """Checks for two different types of credentials.
        (1) A credential which holds a token acquired via a user going thorugh
        the Google OAuth flow.
        (2) A credential which holds a service account key JSON file, which
        can then be used to impersonate any user in the workspace.
        """
        creds: OAuthCredentials | ServiceAccountCredentials | None = None
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
                creds = creds.with_subject(delegated_user_email) if creds else None  # type: ignore

        if creds is None:
            raise PermissionError(
                "Unable to access Gmail - unknown credential structure."
            )

        self.creds = creds
        return new_creds_dict

    def _get_email_body(self, payload: dict[str, Any]) -> str:
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
        email_body_text: str = self._get_email_body(payload)
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

    @staticmethod
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
            result = _execute_with_retry(
                service.users()
                .messages()
                .list(
                    userId="me",
                    pageToken=page_token,
                    q=query,
                    maxResults=self.batch_size,
                )
            )

            page_token = result.get("nextPageToken")
            messages = result.get("messages", [])
            doc_batch = []
            for message in messages:
                message_id = message["id"]
                msg = _execute_with_retry(
                    service.users()
                    .messages()
                    .get(userId="me", id=message_id, format="full")
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
        yield from self._fetch_mails_from_gmail(start, end)


if __name__ == "__main__":
    import json
    import os

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
    connector.load_credentials(
        json.loads(credentials_dict[DB_CREDENTIALS_DICT_TOKEN_KEY])
    )
    document_batch_generator = connector.load_from_state()
    for document_batch in document_batch_generator:
        print(document_batch)
        break
