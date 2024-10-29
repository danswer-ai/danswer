import io
from collections.abc import Callable
from collections.abc import Iterator
from datetime import datetime
from datetime import timezone
from enum import Enum
from typing import Any

from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from googleapiclient.discovery import Resource  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore

from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.connectors.cross_connector_utils.retry_wrapper import retry_builder
from danswer.connectors.google_drive.connector_auth import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)
from danswer.connectors.google_drive.connector_auth import get_google_drive_creds
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import GenerateSlimDocumentOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.interfaces import SlimConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.models import SlimDocument
from danswer.file_processing.extract_file_text import docx_to_text
from danswer.file_processing.extract_file_text import pptx_to_text
from danswer.file_processing.extract_file_text import read_pdf_file
from danswer.file_processing.unstructured import get_unstructured_api_key
from danswer.file_processing.unstructured import unstructured_to_text
from danswer.utils.logger import setup_logger

logger = setup_logger()

_DRIVE_FOLDER_TYPE = "application/vnd.google-apps.folder"
_DRIVE_SHORTCUT_TYPE = "application/vnd.google-apps.shortcut"
_UNSUPPORTED_FILE_TYPE_CONTENT = ""  # keep empty for now

_FILE_FIELDS = "nextPageToken, files(mimeType, id, name, permissions, modifiedTime, webViewLink, shortcutDetails, owners)"
_SLIM_FILE_FIELDS = "nextPageToken, files(id, permissions(emailAddress, type), permissionIds, webViewLink)"
_FOLDER_FIELDS = "nextPageToken, files(id, name, permissions, modifiedTime, webViewLink, shortcutDetails)"
_USER_FIELDS = "nextPageToken, users(primaryEmail)"

# This is a substring of the error google returns when the user doesn't have the correct scopes.
_MISSING_SCOPES_ERROR_STR = "client not authorized for any of the scopes requested"

_SCOPE_DOC_URL = "https://docs.danswer.dev/connectors/google_drive/overview"
_ONYX_SCOPE_INSTRUCTIONS = (
    "You have upgraded Danswer without updating the Google Drive scopes. "
    f"Please refer to the documentation to learn how to update the scopes: {_SCOPE_DOC_URL}"
)
# these errors don't represent a failure in the connector, but simply files
# that can't / shouldn't be indexed
_ERRORS_TO_CONTINUE_ON = [
    "cannotExportFile",
    "exportSizeLimitExceeded",
    "cannotDownloadFile",
]
_SLIM_BATCH_SIZE = 500


class GDriveMimeType(str, Enum):
    DOC = "application/vnd.google-apps.document"
    SPREADSHEET = "application/vnd.google-apps.spreadsheet"
    PDF = "application/pdf"
    WORD_DOC = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    PPT = "application/vnd.google-apps.presentation"
    POWERPOINT = (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    PLAIN_TEXT = "text/plain"
    MARKDOWN = "text/markdown"


GoogleDriveFileType = dict[str, Any]

# Google Drive APIs are quite flakey and may 500 for an
# extended period of time. Trying to combat here by adding a very
# long retry period (~20 minutes of trying every minute)
add_retries = retry_builder(tries=50, max_delay=30)


def execute_paginated_retrieval(
    retrieval_function: Callable[..., Any],
    list_key: str,
    **kwargs: Any,
) -> Iterator[GoogleDriveFileType]:
    """Execute a paginated retrieval from Google Drive API
    Args:
        retrieval_function: The specific list function to call (e.g., service.files().list)
        **kwargs: Arguments to pass to the list function
    """
    next_page_token = ""
    while next_page_token is not None:
        request_kwargs = kwargs.copy()
        if next_page_token:
            request_kwargs["pageToken"] = next_page_token

        results = add_retries(lambda: retrieval_function(**request_kwargs).execute())()

        next_page_token = results.get("nextPageToken")
        for item in results.get(list_key, []):
            yield item


def extract_text(file: dict[str, str], service: Resource) -> str:
    mime_type = file["mimeType"]

    if mime_type not in set(item.value for item in GDriveMimeType):
        # Unsupported file types can still have a title, finding this way is still useful
        return _UNSUPPORTED_FILE_TYPE_CONTENT

    if mime_type in [
        GDriveMimeType.DOC.value,
        GDriveMimeType.PPT.value,
        GDriveMimeType.SPREADSHEET.value,
    ]:
        export_mime_type = (
            "text/plain"
            if mime_type != GDriveMimeType.SPREADSHEET.value
            else "text/csv"
        )
        return (
            service.files()
            .export(fileId=file["id"], mimeType=export_mime_type)
            .execute()
            .decode("utf-8")
        )
    elif mime_type in [
        GDriveMimeType.PLAIN_TEXT.value,
        GDriveMimeType.MARKDOWN.value,
    ]:
        return service.files().get_media(fileId=file["id"]).execute().decode("utf-8")
    if mime_type in [
        GDriveMimeType.WORD_DOC.value,
        GDriveMimeType.POWERPOINT.value,
        GDriveMimeType.PDF.value,
    ]:
        response = service.files().get_media(fileId=file["id"]).execute()
        if get_unstructured_api_key():
            return unstructured_to_text(
                file=io.BytesIO(response), file_name=file.get("name", file["id"])
            )

        if mime_type == GDriveMimeType.WORD_DOC.value:
            return docx_to_text(file=io.BytesIO(response))
        elif mime_type == GDriveMimeType.PDF.value:
            text, _ = read_pdf_file(file=io.BytesIO(response))
            return text
        elif mime_type == GDriveMimeType.POWERPOINT.value:
            return pptx_to_text(file=io.BytesIO(response))

    return _UNSUPPORTED_FILE_TYPE_CONTENT


def _convert_drive_item_to_document(
    file: GoogleDriveFileType, service: Resource
) -> Document | None:
    try:
        # Skip files that are shortcuts
        if file.get("mimeType") == _DRIVE_SHORTCUT_TYPE:
            logger.info("Ignoring Drive Shortcut Filetype")
            return None
        try:
            text_contents = extract_text(file, service) or ""
        except HttpError as e:
            reason = e.error_details[0]["reason"] if e.error_details else e.reason
            message = e.error_details[0]["message"] if e.error_details else e.reason
            if e.status_code == 403 and reason in _ERRORS_TO_CONTINUE_ON:
                logger.warning(
                    f"Could not export file '{file['name']}' due to '{message}', skipping..."
                )
                return None

            raise

        return Document(
            id=file["webViewLink"],
            sections=[Section(link=file["webViewLink"], text=text_contents)],
            source=DocumentSource.GOOGLE_DRIVE,
            semantic_identifier=file["name"],
            doc_updated_at=datetime.fromisoformat(file["modifiedTime"]).astimezone(
                timezone.utc
            ),
            metadata={} if text_contents else {IGNORE_FOR_QA: "True"},
            additional_info=file.get("id"),
        )
    except Exception as e:
        if not CONTINUE_ON_CONNECTOR_FAILURE:
            raise e

        logger.exception("Ran into exception when pulling a file from Google Drive")
    return None


class GoogleDriveConnector(LoadConnector, PollConnector, SlimConnector):
    def __init__(
        self,
        parent_urls: list[str] | None = None,
        include_personal: bool | None = True,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size

        self.initial_parent_ids = []
        if parent_urls:
            self.initial_parent_ids = [url.split("/")[-1] for url in parent_urls]
        self.include_personal = include_personal or True

        self.primary_admin_email: str | None = None
        self.google_domain: str | None = None

        self.creds: OAuthCredentials | ServiceAccountCredentials | None = None

        self.is_slim: bool = False

        self._TRAVERSED_PARENT_IDS: set[str] = set()

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, str] | None:
        primary_admin_email = credentials[DB_CREDENTIALS_PRIMARY_ADMIN_KEY]
        self.google_domain = primary_admin_email.split("@")[1]
        self.primary_admin_email = primary_admin_email

        self.creds, new_creds_dict = get_google_drive_creds(credentials)
        return new_creds_dict

    def get_google_resource(
        self,
        service_name: str = "drive",
        service_version: str = "v3",
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

    def _get_folders_in_parent(
        self,
        service: Resource,
        parent_id: str | None = None,
        personal_drive: bool = False,
    ) -> Iterator[GoogleDriveFileType]:
        # Follow shortcuts to folders
        query = f"(mimeType = '{_DRIVE_FOLDER_TYPE}' or mimeType = '{_DRIVE_SHORTCUT_TYPE}')"

        if parent_id:
            query += f" and '{parent_id}' in parents"

        for file in execute_paginated_retrieval(
            retrieval_function=service.files().list,
            list_key="files",
            corpora="user" if personal_drive else "allDrives",
            supportsAllDrives=not personal_drive,
            includeItemsFromAllDrives=not personal_drive,
            fields=_FOLDER_FIELDS,
            q=query,
        ):
            yield file

    def _get_files_in_parent(
        self,
        service: Resource,
        parent_id: str,
        personal_drive: bool,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> Iterator[GoogleDriveFileType]:
        query = f"mimeType != '{_DRIVE_FOLDER_TYPE}' and '{parent_id}' in parents"
        if time_range_start is not None:
            time_start = datetime.utcfromtimestamp(time_range_start).isoformat() + "Z"
            query += f" and modifiedTime >= '{time_start}'"
        if time_range_end is not None:
            time_stop = datetime.utcfromtimestamp(time_range_end).isoformat() + "Z"
            query += f" and modifiedTime <= '{time_stop}'"

        for file in execute_paginated_retrieval(
            retrieval_function=service.files().list,
            list_key="files",
            corpora="user" if personal_drive else "allDrives",
            supportsAllDrives=not personal_drive,
            includeItemsFromAllDrives=not personal_drive,
            fields=_SLIM_FILE_FIELDS if self.is_slim else _FILE_FIELDS,
            q=query,
        ):
            yield file

    def _crawl_drive_for_files(
        self,
        service: Resource,
        parent_id: str,
        personal_drive: bool,
        time_range_start: SecondsSinceUnixEpoch | None = None,
        time_range_end: SecondsSinceUnixEpoch | None = None,
    ) -> Iterator[GoogleDriveFileType]:
        """Gets all files matching the criteria specified by the args from Google Drive
        in batches of size `batch_size`.
        """
        if parent_id in self._TRAVERSED_PARENT_IDS:
            logger.debug(f"Skipping subfolder since already traversed: {parent_id}")
            return

        self._TRAVERSED_PARENT_IDS.add(parent_id)

        yield from self._get_files_in_parent(
            service=service,
            personal_drive=personal_drive,
            time_range_start=time_range_start,
            time_range_end=time_range_end,
            parent_id=parent_id,
        )

        for subfolder in self._get_folders_in_parent(
            service=service,
            parent_id=parent_id,
            personal_drive=personal_drive,
        ):
            logger.info("Fetching all files in subfolder: " + subfolder["name"])
            yield from self._crawl_drive_for_files(
                service=service,
                parent_id=subfolder["id"],
                personal_drive=personal_drive,
                time_range_start=time_range_start,
                time_range_end=time_range_end,
            )

    def _get_all_user_emails(self) -> list[str]:
        admin_service = self.get_google_resource("admin", "directory_v1")
        emails = []
        for user in execute_paginated_retrieval(
            retrieval_function=admin_service.users().list,
            list_key="users",
            fields=_USER_FIELDS,
            domain=self.google_domain,
        ):
            if email := user.get("primaryEmail"):
                emails.append(email)
        return emails

    def _fetch_drive_items(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> Iterator[GoogleDriveFileType]:
        admin_drive_service = self.get_google_resource()

        parent_ids = self.initial_parent_ids
        if not parent_ids:
            # if no parent ids are specified, get all shared drives using the admin account
            for drive in execute_paginated_retrieval(
                retrieval_function=admin_drive_service.drives().list,
                list_key="drives",
                useDomainAdminAccess=True,
                fields="drives(id)",
            ):
                parent_ids.append(drive["id"])

        # crawl all the shared parent ids for files
        for parent_id in parent_ids:
            for file in self._crawl_drive_for_files(
                service=admin_drive_service,
                parent_id=parent_id,
                personal_drive=False,
                time_range_start=start,
                time_range_end=end,
            ):
                yield file

        # get all personal docs from each users' personal drive
        if self.include_personal:
            logger.info("Checking My Drives for documents")
            all_user_emails = self._get_all_user_emails()
            for email in all_user_emails:
                logger.info(f"Fetching personal files for user: {email}")
                user_drive_service = self.get_google_resource(user_email=email)

                # we dont paginate here because there is only one root folder per user
                # https://developers.google.com/drive/api/guides/v2-to-v3-reference
                id = (
                    user_drive_service.files()
                    .get(fileId="root", fields="id")
                    .execute()["id"]
                )

                yield from self._crawl_drive_for_files(
                    service=user_drive_service,
                    parent_id=id,
                    personal_drive=True,
                    time_range_start=start,
                    time_range_end=end,
                )

    def _fetch_docs_from_drive(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        doc_batch = []
        for file in self._fetch_drive_items(
            start=start,
            end=end,
        ):
            user_email = file.get("owners", [{}])[0].get("emailAddress")
            service = self.get_google_resource(user_email=user_email)
            if doc := _convert_drive_item_to_document(
                file=file,
                service=service,
            ):
                doc_batch.append(doc)
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        try:
            yield from self._fetch_docs_from_drive()
        except Exception as e:
            if _MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(_ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        try:
            yield from self._fetch_docs_from_drive(start, end)
        except Exception as e:
            if _MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(_ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def _fetch_slim_docs_from_drive(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        slim_batch = []
        for file in self._fetch_drive_items(
            start=start,
            end=end,
        ):
            slim_batch.append(
                SlimDocument(
                    id=file["webViewLink"],
                    perm_sync_data={
                        "doc_id": file.get("id"),
                        "permissions": file.get("permissions", []),
                        "permission_ids": file.get("permissionIds", []),
                    },
                )
            )
            if len(slim_batch) >= _SLIM_BATCH_SIZE:
                yield slim_batch
                slim_batch = []
        yield slim_batch

    def retrieve_all_slim_documents(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        self.is_slim = True
        try:
            yield from self._fetch_slim_docs_from_drive(start, end)
        except Exception as e:
            if _MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(_ONYX_SCOPE_INSTRUCTIONS) from e
            raise e
