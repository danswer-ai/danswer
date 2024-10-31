import time
from collections.abc import Callable
from unittest.mock import MagicMock
from unittest.mock import patch

from danswer.access.models import ExternalAccess
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.google_drive.google_utils import execute_paginated_retrieval
from ee.danswer.external_permissions.google_drive.doc_sync import (
    _get_permissions_from_slim_doc,
)
from tests.daily.connectors.google_drive.helpers import DRIVE_MAPPING
from tests.daily.connectors.google_drive.helpers import flatten_file_ranges
from tests.daily.connectors.google_drive.helpers import (
    get_expected_file_names_and_texts,
)
from tests.daily.connectors.google_drive.helpers import PUBLIC_RANGE


def get_keys_available_to_user_from_access_map(
    user_email: str,
    group_map: dict[str, list[str]],
    access_map: dict[str, ExternalAccess],
) -> list[str]:
    """
    Extracts the names of the files available to the user from the access map
    through their own email or group memberships or public access
    """
    group_emails_for_user = []
    for group_email, user_in_group_email_list in group_map.items():
        if user_email in user_in_group_email_list:
            group_emails_for_user.append(group_email)

    accessible_file_names_for_user = []
    for file_name, external_access in access_map.items():
        if external_access.is_public:
            accessible_file_names_for_user.append(file_name)
        elif user_email in external_access.external_user_emails:
            accessible_file_names_for_user.append(file_name)
        elif any(
            group_email in external_access.external_user_group_ids
            for group_email in group_emails_for_user
        ):
            accessible_file_names_for_user.append(file_name)
    return accessible_file_names_for_user


def check_access_for_user(
    user_dict: dict,
    group_map: dict[str, list[str]],
    retrieved_access_map: dict[str, ExternalAccess],
) -> None:
    """
    compares the expected access range of the user to the keys available to the user
    retrieved from the source
    """
    retrieved_keys_available_to_user = get_keys_available_to_user_from_access_map(
        user_dict["email"], group_map, retrieved_access_map
    )

    expected_access_range = list(set(user_dict["access"] + PUBLIC_RANGE))

    expected_file_names, _ = get_expected_file_names_and_texts(expected_access_range)

    retrieved_file_names = set(retrieved_keys_available_to_user)
    if expected_file_names != retrieved_file_names:
        print(user_dict["email"])
        print(expected_file_names)
        print(retrieved_file_names)

    assert expected_file_names == retrieved_file_names


# This function is supposed to map to the group_sync.py file for the google drive connector
# TODO: Call it directly
def get_group_map(google_drive_connector: GoogleDriveConnector) -> dict[str, list[str]]:
    admin_service = google_drive_connector.get_google_resource("admin", "directory_v1")

    group_map: dict[str, list[str]] = {}
    for group in execute_paginated_retrieval(
        admin_service.groups().list,
        list_key="groups",
        domain=google_drive_connector.google_domain,
        fields="groups(email)",
    ):
        # The id is the group email
        group_email = group["email"]

        # Gather group member emails
        group_member_emails: list[str] = []
        for member in execute_paginated_retrieval(
            admin_service.members().list,
            list_key="members",
            groupKey=group_email,
            fields="members(email)",
        ):
            group_member_emails.append(member["email"])
        group_map[group_email] = group_member_emails
    return group_map


@patch(
    "danswer.file_processing.extract_file_text.get_unstructured_api_key",
    return_value=None,
)
def test_all_permissions(
    mock_get_api_key: MagicMock,
    google_drive_service_acct_connector_factory: Callable[..., GoogleDriveConnector],
) -> None:
    google_drive_connector = google_drive_service_acct_connector_factory(
        include_shared_drives=True,
        include_my_drives=True,
    )

    access_map: dict[str, ExternalAccess] = {}
    for slim_doc_batch in google_drive_connector.retrieve_all_slim_documents(
        0, time.time()
    ):
        for slim_doc in slim_doc_batch:
            access_map[
                (slim_doc.perm_sync_data or {})["name"]
            ] = _get_permissions_from_slim_doc(
                google_drive_connector=google_drive_connector,
                slim_doc=slim_doc,
            )

    for file_name, external_access in access_map.items():
        print(file_name, external_access)

    expected_file_ranges = [
        DRIVE_MAPPING["ADMIN"]["range"],
        DRIVE_MAPPING["TEST_USER_1"]["range"],
        DRIVE_MAPPING["TEST_USER_2"]["range"],
        DRIVE_MAPPING["TEST_USER_3"]["range"],
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

    # Should get everything
    assert len(access_map) == len(expected_file_range)

    group_map = get_group_map(google_drive_connector)

    print("groups:\n", group_map)

    check_access_for_user(DRIVE_MAPPING["ADMIN"], group_map, access_map)
    check_access_for_user(DRIVE_MAPPING["TEST_USER_1"], group_map, access_map)
    check_access_for_user(DRIVE_MAPPING["TEST_USER_2"], group_map, access_map)
    check_access_for_user(DRIVE_MAPPING["TEST_USER_3"], group_map, access_map)
