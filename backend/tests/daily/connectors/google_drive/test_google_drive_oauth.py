import time
from collections.abc import Callable
from unittest.mock import MagicMock
from unittest.mock import patch

from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.models import Document
from tests.daily.connectors.google_drive.helpers import (
    assert_retrieved_docs_match_expected,
)
from tests.daily.connectors.google_drive.helpers import DRIVE_ID_MAPPING
from tests.daily.connectors.google_drive.helpers import EMAIL_MAPPING
from tests.daily.connectors.google_drive.helpers import URL_MAPPING


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
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # Should get everything in shared and admin's My Drive with oauth
    expected_file_ids = (
        DRIVE_ID_MAPPING["ADMIN"]
        + DRIVE_ID_MAPPING["SHARED_DRIVE_1"]
        + DRIVE_ID_MAPPING["FOLDER_1"]
        + DRIVE_ID_MAPPING["FOLDER_1_1"]
        + DRIVE_ID_MAPPING["FOLDER_1_2"]
        + DRIVE_ID_MAPPING["SHARED_DRIVE_2"]
        + DRIVE_ID_MAPPING["FOLDER_2"]
        + DRIVE_ID_MAPPING["FOLDER_2_1"]
        + DRIVE_ID_MAPPING["FOLDER_2_2"]
        + DRIVE_ID_MAPPING["SECTIONS"]
    )
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


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
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # Should only get shared drives
    expected_file_ids = (
        DRIVE_ID_MAPPING["SHARED_DRIVE_1"]
        + DRIVE_ID_MAPPING["FOLDER_1"]
        + DRIVE_ID_MAPPING["FOLDER_1_1"]
        + DRIVE_ID_MAPPING["FOLDER_1_2"]
        + DRIVE_ID_MAPPING["SHARED_DRIVE_2"]
        + DRIVE_ID_MAPPING["FOLDER_2"]
        + DRIVE_ID_MAPPING["FOLDER_2_1"]
        + DRIVE_ID_MAPPING["FOLDER_2_2"]
        + DRIVE_ID_MAPPING["SECTIONS"]
    )
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


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
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # Should only get everyone's My Drives
    expected_file_ids = list(range(0, 5))  # Admin's My Drive only
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_drive_one_only(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_drive_one_only")
    drive_urls = [
        URL_MAPPING["SHARED_DRIVE_1"],
    ]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=False,
        shared_drive_urls=",".join([str(url) for url in drive_urls]),
    )
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # We ignore shared_drive_urls if include_shared_drives is False
    expected_file_ids = list(range(20, 40))  # Shared Drive 1 and its folders
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_folder_and_shared_drive(
    mock_get_api_key: MagicMock,
    google_drive_oauth_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    print("\n\nRunning test_folder_and_shared_drive")
    drive_urls = [URL_MAPPING["SHARED_DRIVE_1"]]
    folder_urls = [URL_MAPPING["FOLDER_2"]]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=True,
        include_my_drives=True,
        shared_drive_urls=",".join([str(url) for url in drive_urls]),
        shared_folder_urls=",".join([str(url) for url in folder_urls]),
    )
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # Should
    expected_file_ids = (
        list(range(0, 5))  # Admin's My Drive
        + list(range(20, 40))  # Shared Drive 1 and its folders
        + list(range(45, 60))  # Folder 2 and its subfolders
    )
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


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
        URL_MAPPING["FOLDER_1_1"],
        URL_MAPPING["FOLDER_1_2"],
        URL_MAPPING["FOLDER_2_1"],
        URL_MAPPING["FOLDER_2_2"],
    ]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=False,
        include_my_drives=False,
        shared_folder_urls=",".join([str(url) for url in folder_urls]),
    )
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    expected_file_ids = list(range(30, 40)) + list(  # Folders 1_1 and 1_2
        range(50, 60)
    )  # Folders 2_1 and 2_2
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )


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
        EMAIL_MAPPING["TEST_USER_1"],
        EMAIL_MAPPING["TEST_USER_3"],
    ]
    connector = google_drive_oauth_connector_factory(
        include_shared_drives=False,
        include_my_drives=True,
        my_drive_emails=",".join([str(email) for email in my_drive_emails]),
    )
    retrieved_docs: list[Document] = []
    for doc_batch in connector.poll_source(0, time.time()):
        retrieved_docs.extend(doc_batch)

    # No matter who is specified, when using oauth, if include_my_drives is True,
    # we will get all the files from the admin's My Drive
    expected_file_ids = DRIVE_ID_MAPPING["ADMIN"]
    assert_retrieved_docs_match_expected(
        retrieved_docs=retrieved_docs,
        expected_file_ids=expected_file_ids,
    )
