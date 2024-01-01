import itertools
from collections.abc import Iterator
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import cast

from github import Github
from github.Issue import Issue
from github.PaginatedList import PaginatedList
from github.PullRequest import PullRequest

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


def _batch_github_objects(
    git_objs: PaginatedList, batch_size: int
) -> Iterator[list[PullRequest | Issue]]:
    it = iter(git_objs)
    while True:
        batch = list(itertools.islice(it, batch_size))
        if not batch:
            break
        yield batch


def _convert_pr_to_document(pull_request: PullRequest) -> Document:
    return Document(
        id=pull_request.html_url,
        sections=[Section(link=pull_request.html_url, text=pull_request.body or "")],
        source=DocumentSource.GITHUB,
        semantic_identifier=pull_request.title,
        # updated_at is UTC time but is timezone unaware, explicitly add UTC
        # as there is logic in indexing to prevent wrong timestamped docs
        # due to local time discrepancies with UTC
        doc_updated_at=pull_request.updated_at.replace(tzinfo=timezone.utc),
        metadata={
            "merged": str(pull_request.merged),
            "state": pull_request.state,
        },
    )


def _fetch_issue_comments(issue: Issue) -> str:
    comments = issue.get_comments()
    return "\nComment: ".join(comment.body for comment in comments)


def _convert_issue_to_document(issue: Issue) -> Document:
    return Document(
        id=issue.html_url,
        sections=[Section(link=issue.html_url, text=issue.body or "")],
        source=DocumentSource.GITHUB,
        semantic_identifier=issue.title,
        # updated_at is UTC time but is timezone unaware
        doc_updated_at=issue.updated_at.replace(tzinfo=timezone.utc),
        metadata={
            "state": issue.state,
        },
    )


class GithubConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        repo_owner: str,
        repo_name: str,
        batch_size: int = INDEX_BATCH_SIZE,
        state_filter: str = "all",
        include_prs: bool = True,
        include_issues: bool = False,
    ) -> None:
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.batch_size = batch_size
        self.state_filter = state_filter
        self.include_prs = include_prs
        self.include_issues = include_issues
        self.github_client: Github | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.github_client = Github(credentials["github_access_token"])
        return None

    def _fetch_from_github(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.github_client is None:
            raise ConnectorMissingCredentialError("GitHub")

        repo = self.github_client.get_repo(f"{self.repo_owner}/{self.repo_name}")

        if self.include_prs:
            pull_requests = repo.get_pulls(
                state=self.state_filter, sort="updated", direction="desc"
            )

            for pr_batch in _batch_github_objects(pull_requests, self.batch_size):
                doc_batch: list[Document] = []
                for pr in pr_batch:
                    if start is not None and pr.updated_at < start:
                        yield doc_batch
                        return
                    if end is not None and pr.updated_at > end:
                        continue
                    doc_batch.append(_convert_pr_to_document(cast(PullRequest, pr)))
                yield doc_batch

        if self.include_issues:
            issues = repo.get_issues(
                state=self.state_filter, sort="updated", direction="desc"
            )

            for issue_batch in _batch_github_objects(issues, self.batch_size):
                doc_batch = []
                for issue in issue_batch:
                    issue = cast(Issue, issue)
                    if start is not None and issue.updated_at < start:
                        yield doc_batch
                        return
                    if end is not None and issue.updated_at > end:
                        continue
                    if issue.pull_request is not None:
                        # PRs are handled separately
                        continue
                    doc_batch.append(_convert_issue_to_document(issue))
                yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_github()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_github(start_datetime, end_datetime)


if __name__ == "__main__":
    import os

    connector = GithubConnector(
        repo_owner=os.environ["REPO_OWNER"],
        repo_name=os.environ["REPO_NAME"],
    )
    connector.load_credentials(
        {"github_access_token": os.environ["GITHUB_ACCESS_TOKEN"]}
    )
    document_batches = connector.load_from_state()
    print(next(document_batches))
