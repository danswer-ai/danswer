"""Module with custom fields processing functions"""
import os
from typing import Any
from typing import List
from urllib.parse import urlparse

from jira import JIRA
from jira.resources import CustomFieldOption
from jira.resources import Issue
from jira.resources import User

from danswer.connectors.models import BasicExpertInfo
from danswer.utils.logger import setup_logger

logger = setup_logger()


PROJECT_URL_PAT = "projects"
JIRA_API_VERSION = os.environ.get("JIRA_API_VERSION") or "2"


def best_effort_basic_expert_info(obj: Any) -> BasicExpertInfo | None:
    display_name = None
    email = None
    if hasattr(obj, "display_name"):
        display_name = obj.display_name
    else:
        display_name = obj.get("displayName")

    if hasattr(obj, "emailAddress"):
        email = obj.emailAddress
    else:
        email = obj.get("emailAddress")

    if not email and not display_name:
        return None

    return BasicExpertInfo(display_name=display_name, email=email)


def best_effort_get_field_from_issue(jira_issue: Issue, field: str) -> Any:
    """
    Try to get a field from the issue in the following order:
    1. jira_issue.fields.field
    2. jira_issue.raw["fields"][field]
    3. jira_issue.field
    4. jira_issue.raw[field]

    """
    try:
        if hasattr(jira_issue.fields, field):
            return getattr(jira_issue.fields, field)
    except Exception:
        pass

    try:
        return jira_issue.raw["fields"][field]
    except Exception:
        pass

    try:
        if hasattr(jira_issue, field):
            return getattr(jira_issue, field)
    except Exception:
        pass

    try:
        return jira_issue.raw[field]
    except Exception:
        pass

    return None


def extract_text_from_adf(adf: dict | None) -> str:
    """Extracts plain text from Atlassian Document Format:
    https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/

    WARNING: This function is incomplete and will e.g. skip lists!
    """
    texts = []
    if adf is not None and "content" in adf:
        for block in adf["content"]:
            if "content" in block:
                for item in block["content"]:
                    if item["type"] == "text":
                        texts.append(item["text"])
    return " ".join(texts)


def build_jira_url(jira_client: JIRA, issue_key: str) -> str:
    return f"{jira_client.client_info()}/browse/{issue_key}"


def build_jira_client(credentials: dict[str, Any], jira_base: str) -> JIRA:
    api_token = credentials["jira_api_token"]
    # if user provide an email we assume it's cloud
    if "jira_user_email" in credentials:
        email = credentials["jira_user_email"]
        return JIRA(
            basic_auth=(email, api_token),
            server=jira_base,
            options={"rest_api_version": JIRA_API_VERSION},
        )
    else:
        return JIRA(
            token_auth=api_token,
            server=jira_base,
            options={"rest_api_version": JIRA_API_VERSION},
        )


def extract_jira_project(url: str) -> tuple[str, str]:
    parsed_url = urlparse(url)
    jira_base = parsed_url.scheme + "://" + parsed_url.netloc

    # Split the path by '/' and find the position of 'projects' to get the project name
    split_path = parsed_url.path.split("/")
    if PROJECT_URL_PAT in split_path:
        project_pos = split_path.index(PROJECT_URL_PAT)
        if len(split_path) > project_pos + 1:
            jira_project = split_path[project_pos + 1]
        else:
            raise ValueError("No project name found in the URL")
    else:
        raise ValueError("'projects' not found in the URL")

    return jira_base, jira_project


def get_comment_strs(
    issue: Issue, comment_email_blacklist: tuple[str, ...] = ()
) -> list[str]:
    comment_strs = []
    for comment in issue.fields.comment.comments:
        try:
            body_text = (
                comment.body
                if JIRA_API_VERSION == "2"
                else extract_text_from_adf(comment.raw["body"])
            )

            if (
                hasattr(comment, "author")
                and hasattr(comment.author, "emailAddress")
                and comment.author.emailAddress in comment_email_blacklist
            ):
                continue  # Skip adding comment if author's email is in blacklist

            comment_strs.append(body_text)
        except Exception as e:
            logger.error(f"Failed to process comment due to an error: {e}")
            continue

    return comment_strs


class CustomFieldExtractor:
    @staticmethod
    def _process_custom_field_value(value: Any) -> str:
        """
        Process a custom field value to a string
        """
        try:
            if isinstance(value, str):
                return value
            elif isinstance(value, CustomFieldOption):
                return value.value
            elif isinstance(value, User):
                return value.displayName
            elif isinstance(value, List):
                return " ".join(
                    [CustomFieldExtractor._process_custom_field_value(v) for v in value]
                )
            else:
                return str(value)
        except Exception as e:
            logger.error(f"Error processing custom field value {value}: {e}")
            return ""

    @staticmethod
    def get_issue_custom_fields(
        jira: Issue, custom_fields: dict, max_value_length: int = 250
    ) -> dict:
        """
        Process all custom fields of an issue to a dictionary of strings
        :param jira: jira_issue, bug or similar
        :param custom_fields: custom fields dictionary
        :param max_value_length: maximum length of the value to be processed, if exceeded, it will be truncated
        """

        issue_custom_fields = {
            custom_fields[key]: value
            for key, value in jira.fields.__dict__.items()
            if value and key in custom_fields.keys()
        }

        processed_fields = {}

        if issue_custom_fields:
            for key, value in issue_custom_fields.items():
                processed = CustomFieldExtractor._process_custom_field_value(value)
                # We need max length  parameter, because there are some plugins that often has very long description
                # and there is just a technical information so we just avoid long values
                if len(processed) < max_value_length:
                    processed_fields[key] = processed

        return processed_fields

    @staticmethod
    def get_all_custom_fields(jira_client: JIRA) -> dict:
        """Get all custom fields from Jira"""
        fields = jira_client.fields()
        fields_dct = {
            field["id"]: field["name"] for field in fields if field["custom"] is True
        }
        return fields_dct


class CommonFieldExtractor:
    @staticmethod
    def get_issue_common_fields(jira: Issue) -> dict:
        return {
            "Priority": jira.fields.priority.name if jira.fields.priority else None,
            "Reporter": jira.fields.reporter.displayName
            if jira.fields.reporter
            else None,
            "Assignee": jira.fields.assignee.displayName
            if jira.fields.assignee
            else None,
            "Status": jira.fields.status.name if jira.fields.status else None,
            "Resolution": jira.fields.resolution.name
            if jira.fields.resolution
            else None,
        }
