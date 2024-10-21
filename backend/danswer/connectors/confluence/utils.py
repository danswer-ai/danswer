import io
from datetime import datetime
from datetime import timezone
from typing import Any

import bs4

from danswer.configs.app_configs import (
    CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD,
)
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD
from danswer.connectors.confluence.onyx_confluence import (
    OnyxConfluence,
)
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.file_processing.html_utils import format_document_soup
from danswer.utils.logger import setup_logger

logger = setup_logger()

_USER_NOT_FOUND = "Unknown User"
_USER_ID_TO_DISPLAY_NAME_CACHE: dict[str, str] = {}


def _get_user(confluence_client: OnyxConfluence, user_id: str) -> str:
    """Get Confluence Display Name based on the account-id or userkey value

    Args:
        user_id (str): The user id (i.e: the account-id or userkey)
        confluence_client (Confluence): The Confluence Client

    Returns:
        str: The User Display Name. 'Unknown User' if the user is deactivated or not found
    """
    # Cache hit
    if user_id in _USER_ID_TO_DISPLAY_NAME_CACHE:
        return _USER_ID_TO_DISPLAY_NAME_CACHE[user_id]

    try:
        result = confluence_client.get_user_details_by_accountid(user_id)
        if found_display_name := result.get("displayName"):
            _USER_ID_TO_DISPLAY_NAME_CACHE[user_id] = found_display_name
    except Exception:
        # may need to just not log this error but will leave here for now
        logger.exception(
            f"Unable to get the User Display Name with the id: '{user_id}'"
        )

    return _USER_ID_TO_DISPLAY_NAME_CACHE.get(user_id, _USER_NOT_FOUND)


def extract_text_from_confluence_html(
    confluence_client: OnyxConfluence, confluence_object: dict[str, Any]
) -> str:
    """Parse a Confluence html page and replace the 'user Id' by the real
        User Display Name

    Args:
        confluence_object (dict): The confluence object as a dict
        confluence_client (Confluence): Confluence client

    Returns:
        str: loaded and formated Confluence page
    """
    body = confluence_object["body"]
    object_html = body.get("storage", body.get("view", {})).get("value")

    soup = bs4.BeautifulSoup(object_html, "html.parser")
    for user in soup.findAll("ri:user"):
        user_id = (
            user.attrs["ri:account-id"]
            if "ri:account-id" in user.attrs
            else user.get("ri:userkey")
        )
        if not user_id:
            logger.warning(
                "ri:userkey not found in ri:user element. " f"Found attrs: {user.attrs}"
            )
            continue
        # Include @ sign for tagging, more clear for LLM
        user.replaceWith("@" + _get_user(confluence_client, user_id))
    return format_document_soup(soup)


def attachment_to_content(
    confluence_client: OnyxConfluence,
    attachment: dict[str, Any],
) -> str | None:
    """If it returns None, assume that we should skip this attachment."""
    if attachment["metadata"]["mediaType"] in [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/svg+xml",
        "video/mp4",
        "video/quicktime",
    ]:
        return None

    download_link = confluence_client.url + attachment["_links"]["download"]

    attachment_size = attachment["extensions"]["fileSize"]
    if attachment_size > CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD:
        logger.warning(
            f"Skipping {download_link} due to size. "
            f"size={attachment_size} "
            f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD}"
        )
        return None

    logger.info(f"_attachment_to_content - _session.get: link={download_link}")
    response = confluence_client._session.get(download_link)
    if response.status_code != 200:
        logger.warning(
            f"Failed to fetch {download_link} with invalid status code {response.status_code}"
        )
        return None

    extracted_text = extract_file_text(
        io.BytesIO(response.content),
        file_name=attachment["title"],
        break_on_unprocessable=False,
    )
    if len(extracted_text) > CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD:
        logger.warning(
            f"Skipping {download_link} due to char count. "
            f"char count={len(extracted_text)} "
            f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD}"
        )
        return None

    return extracted_text


def build_confluence_document_id(base_url: str, content_url: str) -> str:
    """For confluence, the document id is the page url for a page based document
        or the attachment download url for an attachment based document

    Args:
        base_url (str): The base url of the Confluence instance
        content_url (str): The url of the page or attachment download url

    Returns:
        str: The document id
    """
    return f"{base_url}{content_url}"


def extract_referenced_attachment_names(page_text: str) -> list[str]:
    """Parse a Confluence html page to generate a list of current
        attachments in use

    Args:
        text (str): The page content

    Returns:
        list[str]: List of filenames currently in use by the page text
    """
    referenced_attachment_filenames = []
    soup = bs4.BeautifulSoup(page_text, "html.parser")
    for attachment in soup.findAll("ri:attachment"):
        referenced_attachment_filenames.append(attachment.attrs["ri:filename"])
    return referenced_attachment_filenames


def datetime_from_string(datetime_string: str) -> datetime:
    datetime_object = datetime.fromisoformat(datetime_string)

    if datetime_object.tzinfo is None:
        # If no timezone info, assume it is UTC
        datetime_object = datetime_object.replace(tzinfo=timezone.utc)
    else:
        # If not in UTC, translate it
        datetime_object = datetime_object.astimezone(timezone.utc)

    return datetime_object
