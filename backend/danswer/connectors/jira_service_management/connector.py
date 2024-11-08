import os
from collections.abc import Iterator
from datetime import datetime
from typing import Any, List

from backend.danswer.connectors.interfaces import LoadConnector, PollConnector, SecondsSinceUnixEpoch, \
    GenerateDocumentsOutput
from backend.danswer.utils.logger import setup_logger
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.jira_service_management.client import JiraServiceManagementAPI, JSMIssue
from danswer.connectors.models import BasicExpertInfo, Section, Document

logger = setup_logger()

class JSMConnector(LoadConnector, PollConnector):

    def __init__(self, project_id: str, batch_size: int = INDEX_BATCH_SIZE, labels_to_skip: List[str] | None = None):
        self.jsm_client = None
        self.project_id = project_id
        self.batch_size = batch_size
        self.labels_to_skip = labels_to_skip

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
        jsm_issues: Iterator[JSMIssue] = self.jsm_client.get_issues(self.project_id, datetime.fromtimestamp(start).isoformat(), datetime.fromtimestamp(end).isoformat()) if start and end else self.jsm_client.get_issues(self.project_id)
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
        issue_content: str = f"{jsm_issue.description}\n" + "\n".join([f"Comment: {comment}" for comment in jsm_issue.comments if comment])
        return Document(
            id=jsm_issue.id,
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
        "api_token": os.environ["JSM_API_TOKEN"],
        "email_id": os.environ["JSM_EMAIL_ID"],
        "domain_id": os.environ["JSM_DOMAIN_ID"],
    })
    print(list(jsm_connector.load_from_state()))