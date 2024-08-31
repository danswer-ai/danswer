import os
from datetime import datetime
from datetime import timezone
from typing import Any, cast

import requests
from requests.auth import HTTPBasicAuth

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()

_ALL_TICKETS_ENDPOINT = "/rest/api/3/search"
_TIMEOUT = 60


def _make_query(
        domain_url: str, endpoint: str,body: dict[str, Any], email: str, api_token: str
    ):
    full_url = domain_url + endpoint
    try:
        response = requests.get(
            full_url,
            params= body,
            auth= HTTPBasicAuth(email, api_token),
            timeout= _TIMEOUT
        )
        if not response.ok:
            raise RuntimeError(
                f"Error retrieving data from Jira Service Management: {response.text}"
            )
        return response
    except Exception as e:
        logger.error(f"Unexpected error occurred while trying query url {full_url}")
        raise e
    

class JiraManagementServiceConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        domain_url: str,
        project: str,
        batch_size: int = INDEX_BATCH_SIZE
    ) -> None:
        self.batch_size = batch_size
        self.email: str | None = None
        self.api_token: str | None = None
        self.domain_url = domain_url
        self.project = project

    def load_credentials(self, credentials: dict[str, Any]) -> None:
        self.email = cast(str, credentials["jira_user_email"])
        self.api_token = cast(str, credentials["jira_api_token"])

    def _pull_all_tickets(
        self, start_date_str: str, end_date_str: str
    ):
        if not self.email or not self.api_token:
            raise ConnectorMissingCredentialError("Jira Service Management")
        params = {
            "jql": (
                f"project = {self.project} AND "
                f"updated >= '{start_date_str}' AND "
                f"updated <= '{end_date_str}'"
            ),
            "startAt": 0,
            "maxResults": self.batch_size
        }
        while True:
            results = _make_query(
                self.domain_ur,
                _ALL_TICKETS_ENDPOINT,
                params,
                self.email,
                self.api_token
            )
            documents = []
            for data in results["issues"]:
                summary = data['fields']['summary']
                key = data['key']
                page_url = f"{self.domain_url}/browse/{key}"
                updated_at = data["fields"].get("updated")
                metadata_dict = {
                    "status":data['fields']['status']["name"]
                }
                id = data["id"]
                documents.append(
                    Document(
                        id = id,
                        sections=[Section(link=page_url, text=summary)],
                        source = DocumentSource.JIRA_SERVICE_MANAGEMENT,
                        semantic_identifier = summary,
                        doc_updated_at=time_str_to_utc(updated_at) if updated_at else None,
                        metadata=metadata_dict
                    )
                )
            yield documents
            if len(documents) < self.batch_size:
                break

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.email is None or self.api_token is None:
            raise ConnectorMissingCredentialError("Jira Service Management")

        start_date_str = datetime.fromtimestamp(start, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )
        end_date_str = datetime.fromtimestamp(end, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )
        yield from self._pull_all_tickets(start_date_str, end_date_str)



if __name__ == "__main__":
    connector = JiraManagementServiceConnector(
        os.environ["JIRA_SERVICE_MANAGEMENT_DOMAIN_URL"],
        os.environ["JIRA_SERVICE_MANAGEMENT_PROJECT_KEY"]
    )
    connector.load_credentials(
        {
            "jira_user_email": os.environ["JIRA_USER_EMAIL"],
            "jira_api_token": os.environ["JIRA_API_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
