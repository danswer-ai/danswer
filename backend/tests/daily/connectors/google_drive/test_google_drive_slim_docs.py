import time
from collections.abc import Callable
from unittest.mock import MagicMock
from unittest.mock import patch

from danswer.access.models import ExternalAccess
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.google_utils.google_utils import execute_paginated_retrieval
from danswer.connectors.google_utils.resources import get_admin_service
from ee.danswer.external_permissions.google_drive.doc_sync import (
    _get_permissions_from_slim_doc,
)
from tests.daily.connectors.google_drive.helpers import EMAIL_MAPPING
from tests.daily.connectors.google_drive.helpers import file_name_template
from tests.daily.connectors.google_drive.helpers import print_discrepencies
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


def assert_correct_access_for_user(
    user_email: str,
    expected_access_ids: list[int],
    group_map: dict[str, list[str]],
    retrieved_access_map: dict[str, ExternalAccess],
) -> None:
    """
    compares the expected access range of the user to the keys available to the user
    retrieved from the source
    """
    retrieved_keys_available_to_user = get_keys_available_to_user_from_access_map(
        user_email, group_map, retrieved_access_map
    )
    retrieved_file_names = set(retrieved_keys_available_to_user)

    # Combine public and user-specific access IDs
    all_accessible_ids = expected_access_ids + PUBLIC_RANGE
    expected_file_names = {file_name_template.format(i) for i in all_accessible_ids}

    print_discrepencies(expected_file_names, retrieved_file_names)

    assert expected_file_names == retrieved_file_names


# This function is supposed to map to the group_sync.py file for the google drive connector
# TODO: Call it directly
def get_group_map(google_drive_connector: GoogleDriveConnector) -> dict[str, list[str]]:
    admin_service = get_admin_service(
        creds=google_drive_connector.creds,
        user_email=google_drive_connector.primary_admin_email,
    )

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

    expected_file_range = (
        list(range(0, 5))  # Admin's My Drive
        + list(range(5, 10))  # TEST_USER_1's My Drive
        + list(range(10, 15))  # TEST_USER_2's My Drive
        + list(range(15, 20))  # TEST_USER_3's My Drive
        + list(range(20, 25))  # Shared Drive 1
        + list(range(25, 30))  # Folder 1
        + list(range(30, 35))  # Folder 1_1
        + list(range(35, 40))  # Folder 1_2
        + list(range(40, 45))  # Shared Drive 2
        + list(range(45, 50))  # Folder 2
        + list(range(50, 55))  # Folder 2_1
        + list(range(55, 60))  # Folder 2_2
        + [61]  # Sections
    )

    # Should get everything
    assert len(access_map) == len(expected_file_range)

    group_map = get_group_map(google_drive_connector)

    print("groups:\n", group_map)

    assert_correct_access_for_user(
        user_email=EMAIL_MAPPING["ADMIN"],
        expected_access_ids=list(range(0, 5))  # Admin's My Drive
        + list(range(20, 60))  # All shared drive content
        + [61],  # Sections
        group_map=group_map,
        retrieved_access_map=access_map,
    )
    assert_correct_access_for_user(
        user_email=EMAIL_MAPPING["TEST_USER_1"],
        expected_access_ids=list(range(5, 10))  # TEST_USER_1's My Drive
        + list(range(20, 40))  # Shared Drive 1 and its folders
        + list(range(0, 2)),  # Access to some of Admin's files
        group_map=group_map,
        retrieved_access_map=access_map,
    )

    assert_correct_access_for_user(
        user_email=EMAIL_MAPPING["TEST_USER_2"],
        expected_access_ids=list(range(10, 15))  # TEST_USER_2's My Drive
        + list(range(25, 40))  # Folder 1 and its subfolders
        + list(range(50, 55))  # Folder 2_1
        + list(range(45, 47)),  # Some files in Folder 2
        group_map=group_map,
        retrieved_access_map=access_map,
    )
    assert_correct_access_for_user(
        user_email=EMAIL_MAPPING["TEST_USER_3"],
        expected_access_ids=list(range(15, 20)),  # TEST_USER_3's My Drive only
        group_map=group_map,
        retrieved_access_map=access_map,
    )
