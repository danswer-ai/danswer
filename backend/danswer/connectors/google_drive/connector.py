from collections.abc import Iterator
from typing import Any

from google.oauth2.credentials import Credentials as OAuthCredentials  # type: ignore
from google.oauth2.service_account import Credentials as ServiceAccountCredentials  # type: ignore

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.google_drive.doc_conversion import (
    convert_drive_item_to_document,
)
from danswer.connectors.google_drive.file_retrieval import crawl_folders_for_files
from danswer.connectors.google_drive.file_retrieval import get_files_in_my_drive
from danswer.connectors.google_drive.file_retrieval import get_files_in_shared_drive
from danswer.connectors.google_drive.models import GoogleDriveFileType
from danswer.connectors.google_utils.google_auth import get_google_creds
from danswer.connectors.google_utils.google_utils import execute_paginated_retrieval
from danswer.connectors.google_utils.resources import get_admin_service
from danswer.connectors.google_utils.resources import get_drive_service
from danswer.connectors.google_utils.resources import get_google_docs_service
from danswer.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)
from danswer.connectors.google_utils.shared_constants import MISSING_SCOPES_ERROR_STR
from danswer.connectors.google_utils.shared_constants import ONYX_SCOPE_INSTRUCTIONS
from danswer.connectors.google_utils.shared_constants import SCOPE_DOC_URL
from danswer.connectors.google_utils.shared_constants import SLIM_BATCH_SIZE
from danswer.connectors.google_utils.shared_constants import USER_FIELDS
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import GenerateSlimDocumentOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.interfaces import SlimConnector
from danswer.connectors.models import SlimDocument
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _extract_str_list_from_comma_str(string: str | None) -> list[str]:
    if not string:
        return []
    return [s.strip() for s in string.split(",") if s.strip()]


def _extract_ids_from_urls(urls: list[str]) -> list[str]:
    return [url.split("/")[-1] for url in urls]


class GoogleDriveConnector(LoadConnector, PollConnector, SlimConnector):
    def __init__(
        self,
        include_shared_drives: bool = True,
        shared_drive_urls: str | None = None,
        include_my_drives: bool = True,
        my_drive_emails: str | None = None,
        shared_folder_urls: str | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
        # OLD PARAMETERS
        folder_paths: list[str] | None = None,
        include_shared: bool | None = None,
        follow_shortcuts: bool | None = None,
        only_org_public: bool | None = None,
        continue_on_failure: bool | None = None,
    ) -> None:
        # Check for old input parameters
        if (
            folder_paths is not None
            or include_shared is not None
            or follow_shortcuts is not None
            or only_org_public is not None
            or continue_on_failure is not None
        ):
            logger.exception(
                "Google Drive connector received old input parameters. "
                "Please visit the docs for help with the new setup: "
                f"{SCOPE_DOC_URL}"
            )
            raise ValueError(
                "Google Drive connector received old input parameters. "
                "Please visit the docs for help with the new setup: "
                f"{SCOPE_DOC_URL}"
            )

        if (
            not include_shared_drives
            and not include_my_drives
            and not shared_folder_urls
        ):
            raise ValueError(
                "At least one of include_shared_drives, include_my_drives,"
                " or shared_folder_urls must be true"
            )

        self.batch_size = batch_size

        self.include_shared_drives = include_shared_drives
        shared_drive_url_list = _extract_str_list_from_comma_str(shared_drive_urls)
        self.shared_drive_ids = _extract_ids_from_urls(shared_drive_url_list)

        self.include_my_drives = include_my_drives
        self.my_drive_emails = _extract_str_list_from_comma_str(my_drive_emails)

        shared_folder_url_list = _extract_str_list_from_comma_str(shared_folder_urls)
        self.shared_folder_ids = _extract_ids_from_urls(shared_folder_url_list)

        self._primary_admin_email: str | None = None

        self._creds: OAuthCredentials | ServiceAccountCredentials | None = None

        self._TRAVERSED_PARENT_IDS: set[str] = set()

    @property
    def primary_admin_email(self) -> str:
        if self._primary_admin_email is None:
            raise RuntimeError(
                "Primary admin email missing, "
                "should not call this property "
                "before calling load_credentials"
            )
        return self._primary_admin_email

    @property
    def google_domain(self) -> str:
        if self._primary_admin_email is None:
            raise RuntimeError(
                "Primary admin email missing, "
                "should not call this property "
                "before calling load_credentials"
            )
        return self._primary_admin_email.split("@")[-1]

    @property
    def creds(self) -> OAuthCredentials | ServiceAccountCredentials:
        if self._creds is None:
            raise RuntimeError(
                "Creds missing, "
                "should not call this property "
                "before calling load_credentials"
            )
        return self._creds

    def _update_traversed_parent_ids(self, folder_id: str) -> None:
        self._TRAVERSED_PARENT_IDS.add(folder_id)

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, str] | None:
        primary_admin_email = credentials[DB_CREDENTIALS_PRIMARY_ADMIN_KEY]
        self._primary_admin_email = primary_admin_email

        self._creds, new_creds_dict = get_google_creds(
            credentials=credentials,
            source=DocumentSource.GOOGLE_DRIVE,
        )
        return new_creds_dict

    def _get_all_user_emails(self) -> list[str]:
        admin_service = get_admin_service(
            creds=self.creds,
            user_email=self.primary_admin_email,
        )
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

    def _fetch_drive_items(
        self,
        is_slim: bool,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> Iterator[GoogleDriveFileType]:
        primary_drive_service = get_drive_service(
            creds=self.creds,
            user_email=self.primary_admin_email,
        )

        if self.include_shared_drives:
            shared_drive_urls = self.shared_drive_ids
            if not shared_drive_urls:
                # if no parent ids are specified, get all shared drives using the admin account
                for drive in execute_paginated_retrieval(
                    retrieval_function=primary_drive_service.drives().list,
                    list_key="drives",
                    useDomainAdminAccess=True,
                    fields="drives(id)",
                ):
                    shared_drive_urls.append(drive["id"])

            # For each shared drive, retrieve all files
            for shared_drive_id in shared_drive_urls:
                for file in get_files_in_shared_drive(
                    service=primary_drive_service,
                    drive_id=shared_drive_id,
                    is_slim=is_slim,
                    cache_folders=bool(self.shared_folder_ids),
                    update_traversed_ids_func=self._update_traversed_parent_ids,
                    start=start,
                    end=end,
                ):
                    yield file

        if self.shared_folder_ids:
            # Crawl all the shared parent ids for files
            for folder_id in self.shared_folder_ids:
                yield from crawl_folders_for_files(
                    service=primary_drive_service,
                    parent_id=folder_id,
                    personal_drive=False,
                    traversed_parent_ids=self._TRAVERSED_PARENT_IDS,
                    update_traversed_ids_func=self._update_traversed_parent_ids,
                    start=start,
                    end=end,
                )

        all_user_emails = []
        # get all personal docs from each users' personal drive
        if self.include_my_drives:
            if isinstance(self.creds, ServiceAccountCredentials):
                all_user_emails = self.my_drive_emails or []

                # If using service account and no emails specified, fetch all users
                if not all_user_emails:
                    all_user_emails = self._get_all_user_emails()

            elif self.primary_admin_email:
                # If using OAuth, only fetch the primary admin email
                all_user_emails = [self.primary_admin_email]

            for email in all_user_emails:
                logger.info(f"Fetching personal files for user: {email}")
                user_drive_service = get_drive_service(self.creds, user_email=email)

                yield from get_files_in_my_drive(
                    service=user_drive_service,
                    email=email,
                    is_slim=is_slim,
                    start=start,
                    end=end,
                )

    def _extract_docs_from_google_drive(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateDocumentsOutput:
        doc_batch = []
        for file in self._fetch_drive_items(
            is_slim=False,
            start=start,
            end=end,
        ):
            user_email = (
                file.get("owners", [{}])[0].get("emailAddress")
                or self.primary_admin_email
            )
            user_drive_service = get_drive_service(self.creds, user_email=user_email)
            docs_service = get_google_docs_service(self.creds, user_email=user_email)
            if doc := convert_drive_item_to_document(
                file=file,
                drive_service=user_drive_service,
                docs_service=docs_service,
            ):
                doc_batch.append(doc)
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        try:
            yield from self._extract_docs_from_google_drive()
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        try:
            yield from self._extract_docs_from_google_drive(start, end)
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e

    def _extract_slim_docs_from_google_drive(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        slim_batch = []
        for file in self._fetch_drive_items(
            is_slim=True,
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
                        "name": file.get("name"),
                        "owner_email": file.get("owners", [{}])[0].get("emailAddress"),
                    },
                )
            )
            if len(slim_batch) >= SLIM_BATCH_SIZE:
                yield slim_batch
                slim_batch = []
        yield slim_batch

    def retrieve_all_slim_documents(
        self,
        start: SecondsSinceUnixEpoch | None = None,
        end: SecondsSinceUnixEpoch | None = None,
    ) -> GenerateSlimDocumentOutput:
        try:
            yield from self._extract_slim_docs_from_google_drive(start, end)
        except Exception as e:
            if MISSING_SCOPES_ERROR_STR in str(e):
                raise PermissionError(ONYX_SCOPE_INSTRUCTIONS) from e
            raise e
