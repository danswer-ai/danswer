import time
from collections.abc import Callable
from unittest.mock import MagicMock
from unittest.mock import patch

from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.models import Document
from tests.daily.connectors.google_drive.helpers import DRIVE_MAPPING
from tests.daily.connectors.google_drive.helpers import flatten_file_ranges
from tests.daily.connectors.google_drive.helpers import validate_file_names_and_texts


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_include_all(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_include_all")
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=True,
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # Should get everything
    expected_file_ranges = [
        DRIVE_MAPPING["ADMIN"]["range"],
        DRIVE_MAPPING["SHARED_DRIVE_1"]["range"],
        DRIVE_MAPPING["FOLDER_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_2"]["range"],
        DRIVE_MAPPING["SHARED_DRIVE_2"]["range"],
        DRIVE_MAPPING["FOLDER_2"]["range"],
        DRIVE_MAPPING["FOLDER_2_1"]["range"],
        DRIVE_MAPPING["FOLDER_2_2"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_include_shared_drives_only(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_include_shared_drives_only")
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=False,
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # Should only get shared drives
    expected_file_ranges = [
        DRIVE_MAPPING["SHARED_DRIVE_1"]["range"],
        DRIVE_MAPPING["FOLDER_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_2"]["range"],
        DRIVE_MAPPING["SHARED_DRIVE_2"]["range"],
        DRIVE_MAPPING["FOLDER_2"]["range"],
        DRIVE_MAPPING["FOLDER_2_1"]["range"],
        DRIVE_MAPPING["FOLDER_2_2"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_include_my_drives_only(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_include_my_drives_only")
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=False,
        include_my_drives=True,
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # Should only get everyone's My Drives
    expected_file_ranges = [
        DRIVE_MAPPING["ADMIN"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_drive_one_only(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_drive_one_only")
    urls = [DRIVE_MAPPING["SHARED_DRIVE_1"]["url"]]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=False,
        shared_drive_urls=",".join([str(url) for url in urls]),
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # We ignore shared_drive_urls if include_shared_drives is False
    expected_file_ranges = [
        DRIVE_MAPPING["SHARED_DRIVE_1"]["range"],
        DRIVE_MAPPING["FOLDER_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_2"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_folder_and_shared_drive(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_folder_and_shared_drive")
    drive_urls = [
        DRIVE_MAPPING["SHARED_DRIVE_1"]["url"],
    ]
    folder_urls = [DRIVE_MAPPING["FOLDER_2"]["url"]]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=True,
        shared_drive_urls=",".join([str(url) for url in drive_urls]),
        shared_folder_urls=",".join([str(url) for url in folder_urls]),
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # Should
    expected_file_ranges = [
        DRIVE_MAPPING["ADMIN"]["range"],
        DRIVE_MAPPING["SHARED_DRIVE_1"]["range"],
        DRIVE_MAPPING["FOLDER_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_2"]["range"],
        DRIVE_MAPPING["FOLDER_2"]["range"],
        DRIVE_MAPPING["FOLDER_2_1"]["range"],
        DRIVE_MAPPING["FOLDER_2_2"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_folders_only(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_folders_only")
    folder_urls = [
        DRIVE_MAPPING["FOLDER_1_1"]["url"],
        DRIVE_MAPPING["FOLDER_1_2"]["url"],
        DRIVE_MAPPING["FOLDER_2_1"]["url"],
        DRIVE_MAPPING["FOLDER_2_2"]["url"],
    ]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=False,
        include_my_drives=False,
        shared_folder_urls=",".join([str(url) for url in folder_urls]),
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    expected_file_ranges = [
        DRIVE_MAPPING["FOLDER_1_1"]["range"],
        DRIVE_MAPPING["FOLDER_1_2"]["range"],
        DRIVE_MAPPING["FOLDER_2_1"]["range"],
        DRIVE_MAPPING["FOLDER_2_2"]["range"],
    ]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_specific_emails(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_specific_emails")
    my_drive_emails = [
        DRIVE_MAPPING["TEST_USER_1"]["email"],
        DRIVE_MAPPING["TEST_USER_3"]["email"],
    ]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=False,
        include_my_drives=True,
        my_drive_emails=",".join([str(email) for email in my_drive_emails]),
    )
    docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        docs.extend(doc_batch)

    # No matter who is specified, when using oauth, if include_my_drives is True,
    # we will get all the files from the admin's My Drive
    expected_file_ranges = [DRIVE_MAPPING["ADMIN"]["range"]]
    expected_file_range = flatten_file_ranges(expected_file_ranges)
    validate_file_names_and_texts(docs, expected_file_range)
