from collections.abc import Callable
from collections.abc import Iterator
from datetime import datetime

from googleapiclient.discovery import Resource  # type: ignore

from danswer.connectors.google_drive.constants import DRIVE_FOLDER_TYPE
from danswer.connectors.google_drive.constants import DRIVE_SHORTCUT_TYPE
from danswer.connectors.google_drive.models import GoogleDriveFileType
from danswer.connectors.google_utils.google_utils import execute_paginated_retrieval
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.utils.logger import setup_logger

logger = setup_logger()

FILE_FIELDS = (
    "nextPageToken, files(mimeType, id, name, permissions, modifiedTime, webViewLink, "
    "shortcutDetails, owners(emailAddress))"
)
SLIM_FILE_FIELDS = (
    "nextPageToken, files(mimeType, id, name, permissions(emailAddress, type), "
    "permissionIds, webViewLink, owners(emailAddress))"
)
FOLDER_FIELDS = "nextPageToken, files(id, name, permissions, modifiedTime, webViewLink, shortcutDetails)"


def _generate_time_range_filter(
    start: SecondsSinceUnixEpoch | None = None,
    end: SecondsSinceUnixEpoch | None = None,
) -> str:
    time_range_filter = ""
    if start is not None:
        time_start = datetime.utcfromtimestamp(start).isoformat() + "Z"
        time_range_filter += f" and modifiedTime >= '{time_start}'"
    if end is not None:
        time_stop = datetime.utcfromtimestamp(end).isoformat() + "Z"
        time_range_filter += f" and modifiedTime <= '{time_stop}'"
    return time_range_filter


def _get_folders_in_parent(
    service: Resource,
    parent_id: str | None = None,
    personal_drive: bool = False,
) -> Iterator[GoogleDriveFileType]:
    # Follow shortcuts to folders
    query = f"(mimeType = '{DRIVE_FOLDER_TYPE}' or mimeType = '{DRIVE_SHORTCUT_TYPE}')"
    query += " and trashed = false"

    if parent_id:
        query += f" and '{parent_id}' in parents"

    for file in execute_paginated_retrieval(
        retrieval_function=service.files().list,
        list_key="files",
        corpora="user" if personal_drive else "allDrives",
        supportsAllDrives=not personal_drive,
        includeItemsFromAllDrives=not personal_drive,
        fields=FOLDER_FIELDS,
        q=query,
    ):
        yield file


def _get_files_in_parent(
    service: Resource,
    parent_id: str,
    personal_drive: bool,
    start: SecondsSinceUnixEpoch | None = None,
    end: SecondsSinceUnixEpoch | None = None,
    is_slim: bool = False,
) -> Iterator[GoogleDriveFileType]:
    query = f"mimeType != '{DRIVE_FOLDER_TYPE}' and '{parent_id}' in parents"
    query += " and trashed = false"
    query += _generate_time_range_filter(start, end)

    for file in execute_paginated_retrieval(
        retrieval_function=service.files().list,
        list_key="files",
        corpora="user" if personal_drive else "allDrives",
        supportsAllDrives=not personal_drive,
        includeItemsFromAllDrives=not personal_drive,
        fields=SLIM_FILE_FIELDS if is_slim else FILE_FIELDS,
        q=query,
    ):
        yield file


def crawl_folders_for_files(
    service: Resource,
    parent_id: str,
    personal_drive: bool,
    traversed_parent_ids: set[str],
    update_traversed_ids_func: Callable[[str], None],
    start: SecondsSinceUnixEpoch | None = None,
    end: SecondsSinceUnixEpoch | None = None,
) -> Iterator[GoogleDriveFileType]:
    """
    This function starts crawling from any folder. It is slower though.
    """
    if parent_id in traversed_parent_ids:
        print(f"Skipping subfolder since already traversed: {parent_id}")
        return

    update_traversed_ids_func(parent_id)

    yield from _get_files_in_parent(
        service=service,
        personal_drive=personal_drive,
        start=start,
        end=end,
        parent_id=parent_id,
    )

    for subfolder in _get_folders_in_parent(
        service=service,
        parent_id=parent_id,
        personal_drive=personal_drive,
    ):
        logger.info("Fetching all files in subfolder: " + subfolder["name"])
        yield from crawl_folders_for_files(
            service=service,
            parent_id=subfolder["id"],
            personal_drive=personal_drive,
            traversed_parent_ids=traversed_parent_ids,
            update_traversed_ids_func=update_traversed_ids_func,
            start=start,
            end=end,
        )


def get_files_in_shared_drive(
    service: Resource,
    drive_id: str,
    is_slim: bool = False,
    cache_folders: bool = True,
    update_traversed_ids_func: Callable[[str], None] = lambda _: None,
    start: SecondsSinceUnixEpoch | None = None,
    end: SecondsSinceUnixEpoch | None = None,
) -> Iterator[GoogleDriveFileType]:
    # If we know we are going to folder crawl later, we can cache the folders here
    if cache_folders:
        # Get all folders being queried and add them to the traversed set
        query = f"mimeType = '{DRIVE_FOLDER_TYPE}'"
        query += " and trashed = false"
        for file in execute_paginated_retrieval(
            retrieval_function=service.files().list,
            list_key="files",
            corpora="drive",
            driveId=drive_id,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            fields="nextPageToken, files(id)",
            q=query,
        ):
            update_traversed_ids_func(file["id"])

    # Get all files in the shared drive
    query = f"mimeType != '{DRIVE_FOLDER_TYPE}'"
    query += " and trashed = false"
    query += _generate_time_range_filter(start, end)
    for file in execute_paginated_retrieval(
        retrieval_function=service.files().list,
        list_key="files",
        corpora="drive",
        driveId=drive_id,
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        fields=SLIM_FILE_FIELDS if is_slim else FILE_FIELDS,
        q=query,
    ):
        yield file


def get_files_in_my_drive(
    service: Resource,
    email: str,
    is_slim: bool = False,
    start: SecondsSinceUnixEpoch | None = None,
    end: SecondsSinceUnixEpoch | None = None,
) -> Iterator[GoogleDriveFileType]:
    query = f"mimeType != '{DRIVE_FOLDER_TYPE}' and '{email}' in owners"
    query += " and trashed = false"
    query += _generate_time_range_filter(start, end)
    for file in execute_paginated_retrieval(
        retrieval_function=service.files().list,
        list_key="files",
        corpora="user",
        fields=SLIM_FILE_FIELDS if is_slim else FILE_FIELDS,
        q=query,
    ):
        yield file


# Just in case we need to get the root folder id
def get_root_folder_id(service: Resource) -> str:
    # we dont paginate here because there is only one root folder per user
    # https://developers.google.com/drive/api/guides/v2-to-v3-reference
    return service.files().get(fileId="root", fields="id").execute()["id"]
