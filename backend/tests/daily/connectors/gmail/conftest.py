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
from danswer.connectors.gmail.connector import GmailConnector
from tests.load_env_vars import load_env_vars


# Load environment variables at the module level
load_env_vars()


@pytest.fixture
def google_gmail_oauth_connector_factory() -> Callable[..., GmailConnector]:
    def _connector_factory(
        primary_admin_email: str = "admin@onyx-test.com",
    ) -> GmailConnector:
        connector = GmailConnector()

        json_string = os.environ["GOOGLE_GMAIL_OAUTH_CREDENTIALS_JSON_STR"]
        refried_json_string = json.loads(json_string)

        credentials_json = {
            DB_CREDENTIALS_DICT_TOKEN_KEY: refried_json_string,
            DB_CREDENTIALS_PRIMARY_ADMIN_KEY: primary_admin_email,
        }
        connector.load_credentials(credentials_json)
        return connector

    return _connector_factory


@pytest.fixture
def google_gmail_service_acct_connector_factory() -> Callable[..., GmailConnector]:
    def _connector_factory(
        primary_admin_email: str = "admin@onyx-test.com",
    ) -> GmailConnector:
        print("Creating GmailConnector with service account credentials")
        connector = GmailConnector()

        json_string = os.environ["GOOGLE_GMAIL_SERVICE_ACCOUNT_JSON_STR"]
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
