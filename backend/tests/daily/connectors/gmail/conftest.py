import json
import os
from collections.abc import Callable

import pytest

from danswer.connectors.gmail.connector import GmailConnector
from danswer.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_DICT_SERVICE_ACCOUNT_KEY,
)
from danswer.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_DICT_TOKEN_KEY,
)
from danswer.connectors.google_utils.shared_constants import (
    DB_CREDENTIALS_PRIMARY_ADMIN_KEY,
)


def load_env_vars(env_file: str = ".env") -> None:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(current_dir, env_file)
    try:
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    os.environ[key] = value.strip()
        print("Successfully loaded environment variables")
    except FileNotFoundError:
        print(f"File {env_file} not found")


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
