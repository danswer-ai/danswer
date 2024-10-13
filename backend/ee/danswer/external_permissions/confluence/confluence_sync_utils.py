from typing import Any

from danswer.connectors.confluence.connector import DanswerConfluence


def build_confluence_client(
    connector_specific_config: dict[str, Any], credentials_json: dict[str, Any]
) -> DanswerConfluence:
    is_cloud = connector_specific_config.get("is_cloud", False)
    return DanswerConfluence(
        api_version="cloud" if is_cloud else "latest",
        # Remove trailing slash from wiki_base if present
        url=connector_specific_config["wiki_base"].rstrip("/"),
        # passing in username causes issues for Confluence data center
        username=credentials_json["confluence_username"] if is_cloud else None,
        password=credentials_json["confluence_access_token"] if is_cloud else None,
        token=credentials_json["confluence_access_token"] if not is_cloud else None,
    )
