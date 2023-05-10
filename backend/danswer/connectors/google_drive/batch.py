import io
import os
from collections.abc import Generator

from danswer.configs.app_configs import GOOGLE_DRIVE_CREDENTIAL_JSON
from danswer.configs.app_configs import GOOGLE_DRIVE_INCLUDE_SHARED
from danswer.configs.app_configs import GOOGLE_DRIVE_TOKENS_JSON
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.type_aliases import BatchLoader
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


def get_credentials() -> Credentials:
    creds = None
    if os.path.exists(GOOGLE_DRIVE_TOKENS_JSON):
        creds = Credentials.from_authorized_user_file(GOOGLE_DRIVE_TOKENS_JSON, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                GOOGLE_DRIVE_CREDENTIAL_JSON, SCOPES
            )
            creds = flow.run_local_server()

        with open(GOOGLE_DRIVE_TOKENS_JSON, "w") as token_file:
            token_file.write(creds.to_json())

    return creds


def get_file_batches(
    service: discovery.Resource,
    include_shared: bool = GOOGLE_DRIVE_INCLUDE_SHARED,
    batch_size: int = INDEX_BATCH_SIZE,
):
    next_page_token = ""
    while next_page_token is not None:
        results = (
            service.files()
            .list(
                pageSize=batch_size,
                supportsAllDrives=include_shared,
                fields="nextPageToken, files(mimeType, id, name, webViewLink)",
                pageToken=next_page_token,
            )
            .execute()
        )
        next_page_token = results.get("nextPageToken")
        files = results["files"]
        valid_files = []
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


class BatchGoogleDriveLoader(BatchLoader):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        include_shared: bool = GOOGLE_DRIVE_INCLUDE_SHARED,
    ) -> None:
        self.batch_size = batch_size
        self.include_shared = include_shared
        self.creds = get_credentials()

    def load(self) -> Generator[list[Document], None, None]:
        service = discovery.build("drive", "v3", credentials=self.creds)
        for files_batch in get_file_batches(
            service, self.include_shared, self.batch_size
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
