from typing import Any

from danswer.connectors.confluence.connector import OnyxConfluence
from danswer.connectors.confluence.onyx_confluence import (
    handle_confluence_rate_limit,
)

_USER_EMAIL_CACHE: dict[str, str | None] = {}


def build_confluence_client(
    connector_specific_config: dict[str, Any], credentials_json: dict[str, Any]
) -> OnyxConfluence:
    is_cloud = connector_specific_config.get("is_cloud", False)
    return OnyxConfluence(
        api_version="cloud" if is_cloud else "latest",
        # Remove trailing slash from wiki_base if present
        url=connector_specific_config["wiki_base"].rstrip("/"),
        # passing in username causes issues for Confluence data center
        username=credentials_json["confluence_username"] if is_cloud else None,
        password=credentials_json["confluence_access_token"] if is_cloud else None,
        token=credentials_json["confluence_access_token"] if not is_cloud else None,
        backoff_and_retry=True,
        max_backoff_retries=60,
        max_backoff_seconds=60,
    )


def get_user_email_from_username__server(
    confluence_client: OnyxConfluence, user_name: str
) -> str | None:
    global _USER_EMAIL_CACHE
    get_user_info = handle_confluence_rate_limit(
        confluence_client.get_mobile_parameters
    )
    if _USER_EMAIL_CACHE.get(user_name) is None:
        try:
            response = get_user_info(user_name)
            email = response.get("email")
        except Exception:
            email = None
        _USER_EMAIL_CACHE[user_name] = email
    return _USER_EMAIL_CACHE[user_name]
