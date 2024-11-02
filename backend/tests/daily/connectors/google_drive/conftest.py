import json
import os
from collections.abc import Callable

import pytest

from danswer.connectors.cross_connector_utils.google.shared_constants import (
    DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    DB_CREDENTIALS_DICT_TOKEN_KEY,
)
from danswer.connectors.cross_connector_utils.google.shared_constants import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from tests.load_env_vars import load_env_vars


# Load environment variables at the module level
load_env_vars()


@pytest.fixture
def google_drive_oauth_connector_factory() -> Callable[..., GoogleDriveConnector]:
    def _connector_factory(
        primary_admin_email: str = "admin@onyx-test.com",
        include_shared_drives: bool = True,
        shared_drive_urls: str | None = None,
        include_my_drives: bool = True,
        my_drive_emails: str | None = None,
        shared_folder_urls: str | None = None,
    ) -> GoogleDriveConnector:
        connector = GoogleDriveConnector(
            include_shared_drives=include_shared_drives,
            shared_drive_urls=shared_drive_urls,
            include_my_drives=include_my_drives,
            my_drive_emails=my_drive_emails,
            shared_folder_urls=shared_folder_urls,
        )

        json_string = os.environ["GOOGLE_DRIVE_OAUTH_CREDENTIALS_JSON_STR"]
        refried_json_string = json.loads(json_string)

        credentials_json = {
            DB_CREDENTIALS_DICT_TOKEN_KEY: refried_json_string,
            DB_CREDENTIALS_PRIMARY_ADMIN_KEY: primary_admin_email,
        }
        connector.load_credentials(credentials_json)
        return connector

    return _connector_factory


@pytest.fixture
def google_drive_service_acct_connector_factory() -> (
    Callable[..., GoogleDriveConnector]
):
    def _connector_factory(
        primary_admin_email: str = "admin@onyx-test.com",
        include_shared_drives: bool = True,
        shared_drive_urls: str | None = None,
        include_my_drives: bool = True,
        my_drive_emails: str | None = None,
        shared_folder_urls: str | None = None,
    ) -> GoogleDriveConnector:
        print("Creating GoogleDriveConnector with service account credentials")
        connector = GoogleDriveConnector(
            include_shared_drives=include_shared_drives,
            shared_drive_urls=shared_drive_urls,
            include_my_drives=include_my_drives,
            my_drive_emails=my_drive_emails,
            shared_folder_urls=shared_folder_urls,
        )

        json_string = os.environ["GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_STR"]
        refried_json_string = json.loads(json_string)

        # Load Service Account Credentials
        connector.load_credentials(
            {
                DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY: refried_json_string,
                DB_CREDENTIALS_PRIMARY_ADMIN_KEY: primary_admin_email,
            }
        )
        return connector

    return _connector_factory
