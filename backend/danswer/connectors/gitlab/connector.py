
import itertools
from collections.abc import Iterator
from datetime import datetime
from datetime import timezone
from typing import Any

import gitlab
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger


logger = setup_logger()


def _batch_gitlab_objects(
    git_objs: list[Any],
    batch_size: int
) -> Iterator[list[Any]]:
    it = iter(git_objs)
    while True:
        batch = list(itertools.islice(it, batch_size))
        if not batch:
            break
        yield batch

def _convert_merge_request_to_document(mr: Any) -> Document:
    return Document(
        id=mr.web_url,
        sections=[Section(link=mr.web_url, text=mr.description or "")],
        source=DocumentSource.GITLAB,
        semantic_identifier=mr.title,
        # updated_at is UTC time but is timezone unaware, explicitly add UTC
        # as there is logic in indexing to prevent wrong timestamped docs
        # due to local time discrepancies with UTC
        doc_updated_at=mr.updated_at.replace(tzinfo=timezone.utc),
        metadata={
            "state": mr.state,
        },
    )


def _convert_issue_to_document(issue: Any) -> Document:
    return Document(
        id=issue.web_url,
        sections=[Section(link=issue.web_url, text=issue.description or "")],
        source=DocumentSource.GITLAB,
        semantic_identifier=issue.title,
        # updated_at is UTC time but is timezone unaware, explicitly add UTC
        # as there is logic in indexing to prevent wrong timestamped docs
        # due to local time discrepancies with UTC
        doc_updated_at=issue.updated_at.replace(tzinfo=timezone.utc),
        metadata={
            "state": issue.state,
        },
    )

class GitlabConnector(LoadConnector, PollConnector):
    def __init__(self,
                 project_owner: str,
                 project_name: str,
                 batch_size: int = INDEX_BATCH_SIZE,
                 state_filter: str = "all",
                 include_mrs: bool = True,
                 include_issues: bool = True,
                 ) -> None:
        self.project_owner=project_owner,
        self.project_name=project_name,
        self.batch_size=batch_size,
        self.state_filter=state_filter,
        self.include_mrs=include_mrs,
        self.include_issues=include_issues,
        self.gitlab_client :gitlab.Gitlab | None = None



    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.gitlab_client = gitlab.Gitlab(credentials["gitlab_url"], private_token=credentials['gitlab_token'])
        return None



    def _fetch_from_gitlab(self, start: datetime | None = None, end: datetime | None = None) -> GenerateDocumentsOutput:
        if self.gitlab_client is None:
            raise ConnectorMissingCredentialError("Gitlab")

        project = self.gitlab_client.projects.get(f"{self.project_owner}/{self.project_name}")

        if self.include_mrs:
            merge_requests = project.mergerequests.list(
                state=self.state_filter, sort="updated_at", direction="desc"
            )

            for mr_batch in _batch_gitlab_objects(merge_requests, self.batch_size):
                doc_batch =[]
                for mr in mr_batch:
                    if start is not None and mr.updated_at < start:
                        yield doc_batch
                        return
                    if end is not None and mr.updated_at > end:
                        continue
                    doc_batch.append(_convert_merge_request_to_document(mr))
                yield doc_batch

        if self.include_issues:
            issues = project.issues.list(
                scope=self.state_filter
            )

            for issue_batch in _batch_gitlab_objects(issues, self.batch_size):
                doc_batch =[]
                for issue in issue_batch:
                    if start is not None and issue.updated_at < start:
                        yield doc_batch
                        return
                    if end is not None and issue.updated_at > end:
                        continue
                    if end is not None :
                         # MRs are handled separately
                        continue
                    doc_batch.append(_convert_issue_to_document(issue))
                yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_gitlab()

    def poll_source(self, last_polled_at: SecondsSinceUnixEpoch) -> GenerateDocumentsOutput:
        return self._fetch_from_gitlab(start=datetime.fromtimestamp(last_polled_at, tz=timezone.utc))





if __name__ == "__main__":
    import os;
    connector = GitlabConnector(
        # gitlab_url="https://gitlab.com/api/v4",
        project_owner=os.environ["PROJECT_OWNER"],
        project_name=os.environ["PROJECT_NAME"],
        batch_size=10,
        state_filter="all",
        include_mrs=True,
        include_issues=True,
    )

    connector.load_credentials(
        {
            "github_access_token": os.environ["GITLAB_ACCESS_TOKEN"],
            "gitlab_url":os.environ["GITLAB_URL"]
        }
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))


    # for batch in connector.load_from_state():
    #     print(batch)
    #     break
    # for batch in connector.poll(0):
    #     print(batch)
    #     break





