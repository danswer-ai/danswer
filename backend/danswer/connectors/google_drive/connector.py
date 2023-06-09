import datetime
import io
from collections.abc import Generator
from typing import Any

from danswer.configs.app_configs import GOOGLE_DRIVE_INCLUDE_SHARED
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.google_drive.connector_auth import DB_CREDENTIALS_DICT_KEY
from danswer.connectors.google_drive.connector_auth import get_drive_tokens
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logging import setup_logger
from google.auth.transport.requests import Request  # type: ignore
from google.oauth2.credentials import Credentials  # type: ignore
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from googleapiclient import discovery  # type: ignore
from PyPDF2 import PdfReader

logger = setup_logger()

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
SUPPORTED_DRIVE_DOC_TYPES = [
    "application/vnd.google-apps.document",
    "application/pdf",
    "application/vnd.google-apps.spreadsheet",
]
ID_KEY = "id"
LINK_KEY = "link"
TYPE_KEY = "type"


def get_file_batches(
    service: discovery.Resource,
    include_shared: bool = GOOGLE_DRIVE_INCLUDE_SHARED,
    batch_size: int = INDEX_BATCH_SIZE,
    time_range_start: SecondsSinceUnixEpoch | None = None,
    time_range_end: SecondsSinceUnixEpoch | None = None,
) -> Generator[list[dict[str, str]], None, None]:
    next_page_token = ""
    while next_page_token is not None:
        query = ""
        if time_range_start is not None:
            time_start = (
                datetime.datetime.utcfromtimestamp(time_range_start).isoformat() + "Z"
            )
            query += f"modifiedTime >= '{time_start}' "
        if time_range_end is not None:
            time_stop = (
                datetime.datetime.utcfromtimestamp(time_range_end).isoformat() + "Z"
            )
            query += f"and modifiedTime <= '{time_stop}'"

        results = (
            service.files()
            .list(
                pageSize=batch_size,
                supportsAllDrives=include_shared,
                fields="nextPageToken, files(mimeType, id, name, webViewLink)",
                pageToken=next_page_token,
                q=query,
            )
            .execute()
        )
        next_page_token = results.get("nextPageToken")
        files = results["files"]
        valid_files: list[dict[str, str]] = []
        for file in files:
            if file["mimeType"] in SUPPORTED_DRIVE_DOC_TYPES:
                valid_files.append(file)
        logger.info(
            f"Parseable Documents in batch: {[file['name'] for file in valid_files]}"
        )
        yield valid_files


def extract_text(file: dict[str, str], service: discovery.Resource) -> str:
    mime_type = file["mimeType"]
    if mime_type == "application/vnd.google-apps.document":
        return (
            service.files()
            .export(fileId=file["id"], mimeType="text/plain")
            .execute()
            .decode("utf-8")
        )
    elif mime_type == "application/vnd.google-apps.spreadsheet":
        return (
            service.files()
            .export(fileId=file["id"], mimeType="text/csv")
            .execute()
            .decode("utf-8")
        )
    # Default download to PDF since most types can be exported as a PDF
    else:
        response = service.files().get_media(fileId=file["id"]).execute()
        pdf_stream = io.BytesIO(response)
        pdf_reader = PdfReader(pdf_stream)
        return "\n".join(page.extract_text() for page in pdf_reader.pages)


class GoogleDriveConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        include_shared: bool = GOOGLE_DRIVE_INCLUDE_SHARED,
    ) -> None:
        self.batch_size = batch_size
        self.include_shared = include_shared
        self.creds: Credentials | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        access_token_json_str = credentials[DB_CREDENTIALS_DICT_KEY]
        creds = get_drive_tokens(token_json_str=access_token_json_str)
        if creds is None:
            raise PermissionError("Unable to access Google Drive.")
        self.creds = creds
        new_creds_json_str = creds.to_json()
        if new_creds_json_str != access_token_json_str:
            return {DB_CREDENTIALS_DICT_KEY: new_creds_json_str}
        return None

    def _fetch_docs_from_drive(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        if self.creds is None:
            raise PermissionError("Not logged into Google Drive")

        service = discovery.build("drive", "v3", credentials=self.creds)
        for files_batch in get_file_batches(
            service,
            self.include_shared,
            self.batch_size,
            time_range_start=start,
            time_range_end=end,
        ):
            doc_batch = []
            for file in files_batch:
                text_contents = extract_text(file, service)
                full_context = file["name"] + " - " + text_contents

                doc_batch.append(
                    Document(
                        id=file["webViewLink"],
                        sections=[Section(link=file["webViewLink"], text=full_context)],
                        source=DocumentSource.GOOGLE_DRIVE,
                        semantic_identifier=file["name"],
                        metadata={},
                    )
                )

            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        yield from self._fetch_docs_from_drive()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        yield from self._fetch_docs_from_drive(start, end)
