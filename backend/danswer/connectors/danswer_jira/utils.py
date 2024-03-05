"""Module with custom fields processing functions"""
from collections.abc import Iterable

from jira import JIRA
from jira.resources import CustomFieldOption
from jira.resources import Issue
from jira.resources import User

from danswer.utils.logger import setup_logger

logger = setup_logger()


class CustomFieldExtractor:
    @staticmethod
    def _process_custom_field_value(value) -> str | None:
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
            elif isinstance(value, Iterable):
                return " ".join(
                    [CustomFieldExtractor._process_custom_field_value(v) for v in value]
                )
            else:
                return str(value)
        except Exception as e:
            logger.error(f"Error processing custom field value {value}: {e}")
            return None

    @staticmethod
    def get_issue_custom_fields(
        jira_issue: Issue, custom_fields: dict, max_value_length: int = 250
    ) -> dict | None:
        """
        Process all custom fields of an issue to a dictionary of strings
        :param jira_issue: jira_issue
        :param custom_fields: custom fields dictionary
        :param max_value_length: maximum length of the value to be processed, if exceeded, it will be truncated
        """

        issue_custom_fields = {
            custom_fields[key]: value
            for key, value in jira_issue.fields.__dict__.items()
            if value and key in custom_fields.keys()
        }

        processed_fields = {}
        for key, value in issue_custom_fields.items():
            processed = CustomFieldExtractor._process_custom_field_value(value)
            # We need max length  parameter, because there are some plugins that often has very long description
            # and there is just a technical information so we just avoid long values
            if len(processed) < max_value_length:
                processed_fields[key] = processed
        return processed_fields

    @staticmethod
    def get_all_custom_fields(jira_client: JIRA) -> dict | None:
        """Get all custom fields from Jira"""
        fields = jira_client.fields()
        fields_dct = {
            field["id"]: field["name"] for field in fields if field["custom"] is True
        }
        return fields_dct


class CommonFieldExtractor:
    @staticmethod
    def get_issue_common_fields(jira_issue: Issue):
        return {
            "Priority": jira_issue.fields.priority.name
            if jira_issue.fields.priority
            else None,
            "Reporter": jira_issue.fields.reporter.displayName
            if jira_issue.fields.reporter
            else None,
            "Assignee": jira_issue.fields.assignee.displayName
            if jira_issue.fields.assignee
            else None,
            "Status": jira_issue.fields.status.name
            if jira_issue.fields.status
            else None,
            "Resolution": jira_issue.fields.resolution.name
            if jira_issue.fields.resolution
            else None,
        }
