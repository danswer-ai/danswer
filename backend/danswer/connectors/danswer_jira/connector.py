from datetime import datetime
from datetime import timezone
from typing import Any
from urllib.parse import urlparse

from jira import JIRA
from jira.resources import Issue

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger


logger = setup_logger()
PROJECT_URL_PAT = "projects"


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


def fetch_jira_issues_batch(
    jql: str,
    start_index: int,
    jira_client: JIRA,
    batch_size: int = INDEX_BATCH_SIZE,
) -> tuple[list[Document], int]:
    doc_batch = []

    batch = jira_client.search_issues(
        jql,
        startAt=start_index,
        maxResults=batch_size,
    )

    for jira in batch:
        if type(jira) != Issue:
            logger.warning(f"Found Jira object not of type Issue {jira}")
            continue

        semantic_rep = f"{jira.fields.description}\n" + "\n".join(
            [f"Comment: {comment.body}" for comment in jira.fields.comment.comments]
        )

        page_url = f"{jira_client.client_info()}/browse/{jira.key}"

        author = None
        try:
            author = BasicExpertInfo(
                display_name=jira.fields.creator.displayName,
                email=jira.fields.creator.emailAddress,
            )
        except Exception:
            # Author should exist but if not, doesn't matter
            pass

        doc_batch.append(
            Document(
                id=page_url,
                sections=[Section(link=page_url, text=semantic_rep)],
                source=DocumentSource.JIRA,
                semantic_identifier=jira.fields.summary,
                doc_updated_at=time_str_to_utc(jira.fields.updated),
                primary_owners=[author] if author is not None else None,
                # TODO add secondary_owners if needed
                metadata={"label": jira.fields.labels} if jira.fields.labels else {},
            )
        )
    return doc_batch, len(batch)


class JiraConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        jira_project_url: str,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size
        self.jira_base, self.jira_project = extract_jira_project(jira_project_url)
        self.jira_client: JIRA | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        email = credentials["jira_user_email"]
        api_token = credentials["jira_api_token"]
        self.jira_client = JIRA(basic_auth=(email, api_token), server=self.jira_base)
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.jira_client is None:
            raise ConnectorMissingCredentialError("Jira")

        start_ind = 0
        while True:
            doc_batch, fetched_batch_size = fetch_jira_issues_batch(
                f"project = {self.jira_project}",
                start_ind,
                self.jira_client,
                self.batch_size,
            )

            if doc_batch:
                yield doc_batch

            start_ind += fetched_batch_size
            if fetched_batch_size < self.batch_size:
                break

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.jira_client is None:
            raise ConnectorMissingCredentialError("Jira")

        start_date_str = datetime.fromtimestamp(start, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )
        end_date_str = datetime.fromtimestamp(end, tz=timezone.utc).strftime(
            "%Y-%m-%d %H:%M"
        )

        jql = (
            f"project = {self.jira_project} AND "
            f"updated >= '{start_date_str}' AND "
            f"updated <= '{end_date_str}'"
        )

        start_ind = 0
        while True:
            doc_batch, fetched_batch_size = fetch_jira_issues_batch(
                jql,
                start_ind,
                self.jira_client,
                self.batch_size,
            )

            if doc_batch:
                yield doc_batch

            start_ind += fetched_batch_size
            if fetched_batch_size < self.batch_size:
                break


if __name__ == "__main__":
    import os

    connector = JiraConnector(os.environ["JIRA_PROJECT_URL"])
    connector.load_credentials(
        {
            "jira_user_email": os.environ["JIRA_USER_EMAIL"],
            "jira_api_token": os.environ["JIRA_API_TOKEN"],
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
