import itertools
from collections.abc import Generator

from danswer.configs.app_configs import GITHUB_ACCESS_TOKEN
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.type_aliases import BatchLoader
from danswer.utils.logging import setup_logger
from github import Github

logger = setup_logger()

github_client = Github(GITHUB_ACCESS_TOKEN)


def get_pr_batches(pull_requests, batch_size):
    it = iter(pull_requests)
    while True:
        batch = list(itertools.islice(it, batch_size))
        if not batch:
            break
        yield batch


class BatchGithubLoader(BatchLoader):
    def __init__(
        self,
        repo_owner: str,
        repo_name: str,
        batch_size: int = INDEX_BATCH_SIZE,
        state_filter: str = "all",
    ) -> None:
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.batch_size = batch_size
        self.state_filter = state_filter

    def load(self) -> Generator[list[Document], None, None]:
        repo = github_client.get_repo(f"{self.repo_owner}/{self.repo_name}")
        pull_requests = repo.get_pulls(state=self.state_filter)
        for pr_batch in get_pr_batches(pull_requests, self.batch_size):
            doc_batch = []
            for pull_request in pr_batch:
                full_context = f"Pull-Request {pull_request.title}  {pull_request.body}"
                doc_batch.append(
                    Document(
                        id=pull_request.url,
                        sections=[Section(link=pull_request.url, text=full_context)],
                        source=DocumentSource.GITHUB,
                        semantic_identifier=pull_request.title,
                        metadata={
                            "last_modified": pull_request.last_modified,
                            "merged": pull_request.merged,
                            "state": pull_request.state,
                        },
                    )
                )

            yield doc_batch
