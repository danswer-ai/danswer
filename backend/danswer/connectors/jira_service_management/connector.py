import os
import time
from collections.abc import Iterator
from datetime import datetime
from typing import Any, List

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.jira_service_management.client import JiraServiceManagementAPI, JSMIssue
from danswer.connectors.models import BasicExpertInfo, Section, Document
from danswer.utils.logger import setup_logger

logger = setup_logger()
JQL_DATE_FORMAT = "%Y-%m-%d %H:%M"

class JSMConnector(LoadConnector, PollConnector):

    def __init__(self, jsm_project_id: str, batch_size: int = INDEX_BATCH_SIZE, issue_label_blacklist: List[str] | None = None):
        self.jsm_client = None
        self.project_id = jsm_project_id
        self.batch_size = batch_size
        self.labels_to_skip = issue_label_blacklist

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.jsm_client = JiraServiceManagementAPI(**credentials, labels_to_skip=self.labels_to_skip)
        logger.info("JSM credentials loaded and API client initialised")
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        logger.info("Starting full index of all issues in given JSM project")
        return self.poll_source(0, 0)

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        jsm_issues: Iterator[JSMIssue] = self.jsm_client.get_issues(self.project_id, datetime.fromtimestamp(start).strftime(JQL_DATE_FORMAT), datetime.fromtimestamp(end).strftime(JQL_DATE_FORMAT)) if start or end else self.jsm_client.get_issues(self.project_id)
        docs_batch = []
        for jsm_issue in jsm_issues:
            docs_batch.append(self._message_to_doc(jsm_issue))
            if len(docs_batch) >= self.batch_size:
                logger.info(f"Yielding batch of {len(docs_batch)} documents")
                yield docs_batch
                docs_batch = []
        if docs_batch:
            logger.info(f"Yielding final batch of {len(docs_batch)} documents")
            yield docs_batch
        logger.info("JSM poll completed")

    @staticmethod
    def _message_to_doc(jsm_issue: JSMIssue):
        issue_content: str = f"{jsm_issue.description}"
        comments_str: str = "\n".join([f"Comment: {comment}" for comment in jsm_issue.comments if comment])
        if comments_str:
            issue_content += "\n" + comments_str
        return Document(
            id=jsm_issue.id,
            title=jsm_issue.summary,
            sections=[Section(link=jsm_issue.url, text=issue_content)],
            doc_updated_at=jsm_issue.last_modified_time,
            source=DocumentSource.JIRA_SERVICE_MANAGEMENT,
            semantic_identifier=jsm_issue.summary,
            primary_owners=[BasicExpertInfo(display_name=person.name, email=person.email) for person in (jsm_issue.assigned_to, jsm_issue.created_by) if person],
            metadata={
                "priority": jsm_issue.priority,
                "status": jsm_issue.status,
                "resolution": jsm_issue.resolution,
                "label": jsm_issue.labels,
            }
        )

if __name__ == '__main__':
    jsm_connector = JSMConnector(os.environ["JSM_PROJECT_ID"])
    jsm_connector.load_credentials({
        "jsm_api_key": os.environ["JSM_API_TOKEN"],
        "jsm_email_id": os.environ["JSM_EMAIL_ID"],
        "jsm_domain_id": os.environ["JSM_DOMAIN_ID"],
    })
    print(list(jsm_connector.poll_source(0, time.time())))