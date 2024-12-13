import io
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import Dict
from urllib.parse import quote

import bs4  # type: ignore
import requests  # type: ignore

from danswer.configs.app_configs import (
    CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD,
)
from danswer.configs.app_configs import CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD
from danswer.configs.app_configs import (
    CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED,
)
from danswer.configs.chat_configs import CONFLUENCE_IMAGE_SUMMARIZATION_SYSTEM_PROMPT
from danswer.configs.chat_configs import CONFLUENCE_IMAGE_SUMMARIZATION_USER_PROMPT
from danswer.connectors.confluence.onyx_confluence import (
    OnyxConfluence,
)
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.file_processing.html_utils import format_document_soup
from danswer.file_processing.image_summarization import summarize_image_pipeline
from danswer.llm.interfaces import LLM
from danswer.utils.logger import setup_logger


logger = setup_logger()


_USER_EMAIL_CACHE: dict[str, str | None] = {}


def get_user_email_from_username__server(
    confluence_client: OnyxConfluence, user_name: str
) -> str | None:
    global _USER_EMAIL_CACHE
    if _USER_EMAIL_CACHE.get(user_name) is None:
        try:
            response = confluence_client.get_mobile_parameters(user_name)
            email = response.get("email")
        except Exception:
            # For now, we'll just return a string that indicates failure
            # We may want to revert to returning None in the future
            # email = None
            email = f"FAILED TO GET CONFLUENCE EMAIL FOR {user_name}"
            logger.warning(f"failed to get confluence email for {user_name}")
        _USER_EMAIL_CACHE[user_name] = email
    return _USER_EMAIL_CACHE[user_name]


_USER_NOT_FOUND = "Unknown Confluence User"
_USER_ID_TO_DISPLAY_NAME_CACHE: dict[str, str | None] = {}


def _get_user(confluence_client: OnyxConfluence, user_id: str) -> str:
    """Get Confluence Display Name based on the account-id or userkey value

    Args:
        user_id (str): The user id (i.e: the account-id or userkey)
        confluence_client (Confluence): The Confluence Client

    Returns:
        str: The User Display Name. 'Unknown User' if the user is deactivated or not found
    """
    global _USER_ID_TO_DISPLAY_NAME_CACHE
    if _USER_ID_TO_DISPLAY_NAME_CACHE.get(user_id) is None:
        try:
            result = confluence_client.get_user_details_by_userkey(user_id)
            found_display_name = result.get("displayName")
        except Exception:
            found_display_name = None

        if not found_display_name:
            try:
                result = confluence_client.get_user_details_by_accountid(user_id)
                found_display_name = result.get("displayName")
            except Exception:
                found_display_name = None

        _USER_ID_TO_DISPLAY_NAME_CACHE[user_id] = found_display_name

    return _USER_ID_TO_DISPLAY_NAME_CACHE.get(user_id) or _USER_NOT_FOUND


def extract_text_from_confluence_html(
    confluence_client: OnyxConfluence,
    confluence_object: dict[str, Any],
    fetched_titles: set[str],
) -> str:
    """Parse a Confluence html page and replace the 'user Id' by the real
        User Display Name

    Args:
        confluence_object (dict): The confluence object as a dict
        confluence_client (Confluence): Confluence client
        fetched_titles (set[str]): The titles of the pages that have already been fetched
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

    for html_page_reference in soup.findAll("ac:structured-macro"):
        # Here, we only want to process page within page macros
        if html_page_reference.attrs.get("ac:name") != "include":
            continue

        page_data = html_page_reference.find("ri:page")
        if not page_data:
            logger.warning(
                f"Skipping retrieval of {html_page_reference} because because page data is missing"
            )
            continue

        page_title = page_data.attrs.get("ri:content-title")
        if not page_title:
            # only fetch pages that have a title
            logger.warning(
                f"Skipping retrieval of {html_page_reference} because it has no title"
            )
            continue

        if page_title in fetched_titles:
            # prevent recursive fetching of pages
            logger.debug(f"Skipping {page_title} because it has already been fetched")
            continue

        fetched_titles.add(page_title)

        # Wrap this in a try-except because there are some pages that might not exist
        try:
            page_query = f"type=page and title='{quote(page_title)}'"

            page_contents: dict[str, Any] | None = None
            # Confluence enforces title uniqueness, so we should only get one result here
            for page in confluence_client.paginated_cql_retrieval(
                cql=page_query,
                expand="body.storage.value",
                limit=1,
            ):
                page_contents = page
                break
        except Exception as e:
            logger.warning(
                f"Error getting page contents for object {confluence_object}: {e}"
            )
            continue

        if not page_contents:
            continue

        text_from_page = extract_text_from_confluence_html(
            confluence_client=confluence_client,
            confluence_object=page_contents,
            fetched_titles=fetched_titles,
        )

        html_page_reference.replaceWith(text_from_page)

    for html_link_body in soup.findAll("ac:link-body"):
        # This extracts the text from inline links in the page so they can be
        # represented in the document text as plain text
        try:
            text_from_link = html_link_body.text
            html_link_body.replaceWith(f"(LINK TEXT: {text_from_link})")
        except Exception as e:
            logger.warning(f"Error processing ac:link-body: {e}")

    return format_document_soup(soup)


def validate_attachment_filetype(media_type: str) -> bool:
    if media_type.startswith("video/") or media_type == "application/gliffy+json":
        return False
    return True


def attachment_to_content(
    confluence_client: OnyxConfluence,
    attachment: dict[str, Any],
    page_context: str,
    llm: LLM,
) -> str | None:
    """If it returns None, assume that we should skip this attachment."""
    download_link = _attachment_to_download_link(confluence_client, attachment)

    media_type = attachment["metadata"]["mediaType"]

    if not validate_attachment_filetype(media_type):
        logger.warning(
            f"Cannot convert attachment {download_link} with unsupported media type to text: {media_type}."
        )
        return None

    attachment_size = attachment["extensions"]["fileSize"]
    if attachment_size > CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD:
        logger.warning(
            f"Skipping attachment {download_link} due to size. "
            f"size={attachment_size} "
            f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_SIZE_THRESHOLD}"
        )
        return None

    if media_type.startswith("image/"):
        if CONFLUENCE_IMAGE_SUMMARIZATION_ENABLED:
            try:
                # get images from page
                summarization = _summarize_image_attachment(
                    attachment=attachment,
                    page_context=page_context,
                    confluence_client=confluence_client,
                    llm=llm,
                )
                return summarization
            except Exception as e:
                logger.error(f"Failed to summarize image: {attachment}", exc_info=e)
        else:
            logger.warning(
                "Image summarization is disabled. Skipping image attachment %s",
                download_link,
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

    if not extracted_text:
        logger.warning(
            "Text conversion of attachment %s resulted in an empty string.",
            download_link,
        )
        return None

    if len(extracted_text) > CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD:
        logger.warning(
            f"Skipping attachment {download_link} due to char count. "
            f"char count={len(extracted_text)} "
            f"threshold={CONFLUENCE_CONNECTOR_ATTACHMENT_CHAR_COUNT_THRESHOLD}"
        )
        return None

    return extracted_text


def build_confluence_document_id(
    base_url: str, content_url: str, is_cloud: bool
) -> str:
    """For confluence, the document id is the page url for a page based document
        or the attachment download url for an attachment based document

    Args:
        base_url (str): The base url of the Confluence instance
        content_url (str): The url of the page or attachment download url

    Returns:
        str: The document id
    """
    if is_cloud and not base_url.endswith("/wiki"):
        base_url += "/wiki"
    return f"{base_url}{content_url}"


def _extract_referenced_attachment_names(page_text: str) -> list[str]:
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


def _attachment_to_download_link(
    confluence_client: OnyxConfluence, attachment: dict[str, Any]
) -> str:
    """Extracts the download link to images."""
    return confluence_client.url + attachment["_links"]["download"]


def _summarize_image_attachment(
    attachment: Dict[str, Any],
    page_context: str,
    confluence_client: OnyxConfluence,
    llm: LLM,
) -> str:
    title = attachment["title"]
    download_link = _attachment_to_download_link(confluence_client, attachment)

    try:
        # get image from url
        image_data = confluence_client.get(
            download_link, absolute=True, not_json_response=True
        )
    except requests.exceptions.RequestException as e:
        raise ValueError(
            f"Failed to fetch image for summarization from {download_link}"
        ) from e

    # get image summary
    # format user prompt: add page title and XML content of page to provide a better summarization
    user_prompt = CONFLUENCE_IMAGE_SUMMARIZATION_USER_PROMPT.format(
        title=title, page_title=attachment["title"], confluence_xml=page_context
    )
    summary = summarize_image_pipeline(
        llm, image_data, user_prompt, CONFLUENCE_IMAGE_SUMMARIZATION_SYSTEM_PROMPT
    )

    return summary
