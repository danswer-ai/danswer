import fnmatch
import io
import mimetypes
import time
from collections import deque
from collections.abc import Iterator
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from typing import Any
from typing import cast

from github import ContentFile
from github import Github
from github import RateLimitExceededException
from github import Repository
from github.Issue import Issue
from github.PaginatedList import PaginatedList
from github.PullRequest import PullRequest

from danswer.configs.app_configs import GITHUB_CONNECTOR_BASE_URL
from danswer.configs.app_configs import GITHUB_CONNECTOR_INCLUDE_CODE_FILES
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.file_processing.extract_file_text import extract_file_text
from danswer.utils.batching import batch_generator
from danswer.utils.logger import setup_logger


# List of directories/Files to exclude
exclude_patterns = [
    "logs",
    ".github/",
    ".gitlab/",
    ".pre-commit-config.yaml",
]
logger = setup_logger()


_MAX_NUM_RATE_LIMIT_RETRIES = 5


def _sleep_after_rate_limit_exception(github_client: Github) -> None:
    sleep_time = github_client.get_rate_limit().core.reset.replace(
        tzinfo=timezone.utc
    ) - datetime.now(tz=timezone.utc)
    sleep_time += timedelta(minutes=1)  # add an extra minute just to be safe
    logger.info(f"Ran into Github rate-limit. Sleeping {sleep_time.seconds} seconds.")
    time.sleep(sleep_time.seconds)


def _get_batch_rate_limited(
    git_objs: PaginatedList, page_num: int, github_client: Github, attempt_num: int = 0
) -> list[Any]:
    if attempt_num > _MAX_NUM_RATE_LIMIT_RETRIES:
        raise RuntimeError(
            "Re-tried fetching batch too many times. Something is going wrong with fetching objects from Github"
        )

    try:
        objs = list(git_objs.get_page(page_num))
        # fetch all data here to disable lazy loading later
        # this is needed to capture the rate limit exception here (if one occurs)
        for obj in objs:
            if hasattr(obj, "raw_data"):
                getattr(obj, "raw_data")
        return objs
    except RateLimitExceededException:
        _sleep_after_rate_limit_exception(github_client)
        return _get_batch_rate_limited(
            git_objs, page_num, github_client, attempt_num + 1
        )


def _batch_github_objects(
    git_objs: PaginatedList, github_client: Github, batch_size: int
) -> Iterator[list[Any]]:
    page_num = 0
    while True:
        batch = _get_batch_rate_limited(git_objs, page_num, github_client)
        page_num += 1

        if not batch:
            break

        for mini_batch in batch_generator(batch, batch_size=batch_size):
            yield mini_batch


def _get_contents_rate_limited(
    repo: Repository.Repository,
    path: str,
    github_client: Github,
    batch_size: int,
    attempt_num: int = 0
) -> Iterator[list[Any]]:
    if attempt_num > _MAX_NUM_RATE_LIMIT_RETRIES:
        raise RuntimeError(
            "Re-tried fetching contents too many times. Something is going wrong with fetching contents from Github"
        )

    try:
        batch = repo.get_contents(path=path)
        if not isinstance(batch, list):
            batch = [batch]
        iterable = batch_generator(batch, batch_size=batch_size)
    except RateLimitExceededException:
        _sleep_after_rate_limit_exception(github_client)
        iterable = _get_contents_rate_limited(
            repo, path, github_client, batch_size, attempt_num + 1
        )

    for mini_batch in iterable:
        yield mini_batch


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
            "type": "pull_request",
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
            "type": "issue",
            "state": issue.state,
        },
    )


def _convert_code_to_document(file: ContentFile.ContentFile) -> Document:
    def _extract_content_file_text(file: ContentFile.ContentFile) -> str:
        try:
            decoded_content = file.decoded_content
        except Exception as e:
            logger.warning(f"Cannot decode code file {file.html_url} due to {e}")
            return ""

        text = extract_file_text(
            file.name,
            io.BytesIO(decoded_content),
            break_on_unprocessable=False,
        )

        if not text:
            # Heuristic #1: Skip definite images and videos (for example, SVG
            # is a plain-text format but we don't want to index it regardless)
            content_type, _ = mimetypes.guess_type(file.name)
            if content_type and content_type.split("/")[0] in ["image", "video"]:
                logger.debug(f"Skipping non-indexable content: {file.html_url}")
                return ""

            # Heuristic #2: Skip non-UTF-8 content, which is usually binary
            # files
            try:
                text = decoded_content.decode("utf-8")
            except UnicodeDecodeError:
                logger.debug(f"Skipping non-UTF-8 content: {file.html_url}")
                return ""

        return text

    # We create a document for each repository file; it's just that not all
    # documents will have indexable textual content
    doc = Document(
        id=file.html_url,
        sections=[Section(link=file.html_url, text=_extract_content_file_text(file))],
        source=DocumentSource.GITHUB,
        semantic_identifier=file.name,
        doc_updated_at=None,
        metadata={
            "type": "code",
            "path": file.path,
        },
    )
    return doc


def _should_exclude(path: str) -> bool:
    """Check if a path matches any of the exclude patterns."""
    return any(fnmatch.fnmatch(path, pattern) for pattern in exclude_patterns)


class GithubConnector(LoadConnector, PollConnector):
    EPOCH_DATETIME = datetime(1970, 1, 1, tzinfo=timezone.utc)

    def __init__(
        self,
        repo_owner: str,
        repo_name: str,
        batch_size: int = INDEX_BATCH_SIZE,
        state_filter: str = "all",
        include_prs: bool = True,
        include_issues: bool = False,
        include_code_files: bool = GITHUB_CONNECTOR_INCLUDE_CODE_FILES,
    ) -> None:
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.batch_size = batch_size
        self.state_filter = state_filter
        self.include_prs = include_prs
        self.include_issues = include_issues
        self.include_code_files = include_code_files
        self.github_client: Github | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.github_client = (
            Github(
                credentials["github_access_token"], base_url=GITHUB_CONNECTOR_BASE_URL
            )
            if GITHUB_CONNECTOR_BASE_URL
            else Github(credentials["github_access_token"])
        )
        return None

    def _get_github_repo(
        self, github_client: Github, attempt_num: int = 0
    ) -> Repository.Repository:
        if attempt_num > _MAX_NUM_RATE_LIMIT_RETRIES:
            raise RuntimeError(
                "Re-tried fetching repo too many times. Something is going wrong with fetching objects from Github"
            )

        try:
            return github_client.get_repo(f"{self.repo_owner}/{self.repo_name}")
        except RateLimitExceededException:
            _sleep_after_rate_limit_exception(github_client)
            return self._get_github_repo(github_client, attempt_num + 1)

    def _fetch_from_github(
        self, start: datetime, end: datetime
    ) -> GenerateDocumentsOutput:
        if self.github_client is None:
            raise ConnectorMissingCredentialError("GitHub")

        repo = self._get_github_repo(self.github_client)

        # Fetch code files. This is only done on the initial load (start is
        # January 1, 1970) because there's currently no obvious way to
        # determine the "last updated date" for a repository file.
        if (self.include_code_files and start == self.EPOCH_DATETIME):
            queue = deque([""])  # Start with the root directory
            while queue:
                current_path = queue.popleft()
                for file_batch in _get_contents_rate_limited(
                    repo, current_path, self.github_client, self.batch_size
                ):
                    code_doc_batch: list[Document] = []
                    for file in file_batch:
                        file = cast(ContentFile.ContentFile, file)

                        if _should_exclude(file.path):
                            continue

                        if file.type == "file":
                            code_doc_batch.append(_convert_code_to_document(file))
                        elif file.type == "dir":
                            queue.append(file.path)

                    if code_doc_batch:
                        yield code_doc_batch

        if self.include_prs:
            pull_requests = repo.get_pulls(
                state=self.state_filter, sort="updated", direction="desc"
            )

            for pr_batch in _batch_github_objects(
                pull_requests, self.github_client, self.batch_size
            ):
                doc_batch: list[Document] = []
                for pr in pr_batch:
                    pr = cast(PullRequest, pr)
                    updated_at = pr.updated_at.replace(tzinfo=timezone.utc)
                    if updated_at < start:
                        yield doc_batch
                        return
                    if updated_at > end:
                        continue
                    doc_batch.append(_convert_pr_to_document(pr))
                yield doc_batch

        if self.include_issues:
            issues = repo.get_issues(
                state=self.state_filter, sort="updated", direction="desc"
            )

            for issue_batch in _batch_github_objects(
                issues, self.github_client, self.batch_size
            ):
                doc_batch = []
                for issue in issue_batch:
                    issue = cast(Issue, issue)
                    updated_at = issue.updated_at.replace(tzinfo=timezone.utc)
                    if updated_at < start:
                        yield doc_batch
                        return
                    if updated_at > end:
                        continue
                    if issue.pull_request is not None:
                        # PRs are handled separately
                        continue
                    doc_batch.append(_convert_issue_to_document(issue))
                yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_github(
            start=self.EPOCH_DATETIME,
            end=datetime.now(timezone.utc)
        )

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)

        # Move start time back by 3 hours, since some Issues/PRs are getting dropped
        # Could be due to delayed processing on GitHub side
        # The non-updated issues since last poll will be shortcut-ed and not embedded
        adjusted_start_datetime = max(
            start_datetime - timedelta(hours=3),
            self.EPOCH_DATETIME
        )

        return self._fetch_from_github(adjusted_start_datetime, end_datetime)


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
