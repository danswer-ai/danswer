import datetime
from typing import Any

from danswer.configs.app_configs import CONTINUE_ON_CONNECTOR_FAILURE
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.asana import asana_api
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class AsanaConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        asana_workspace_id: str,
        asana_project_ids: str | None = None,
        asana_team_id: str | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
        continue_on_failure: bool = CONTINUE_ON_CONNECTOR_FAILURE,
    ) -> None:
        self.workspace_id = asana_workspace_id
        self.project_ids_to_index: list[str] | None = (
            asana_project_ids.split(",") if asana_project_ids is not None else None
        )
        self.asana_team_id = asana_team_id
        self.batch_size = batch_size
        self.continue_on_failure = continue_on_failure

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.api_token = credentials["asana_api_token_secret"]
        self.asana_client = asana_api.AsanaAPI(
            api_token=self.api_token,
            workspace_gid=self.workspace_id,
            team_gid=self.asana_team_id,
        )
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        start_time = datetime.datetime.fromtimestamp(start).isoformat()
        asana = asana_api.AsanaAPI(
            api_token=self.api_token,
            workspace_gid=self.workspace_id,
            team_gid=self.asana_team_id,
        )
        docs_batch: list[Document] = []
        tasks = asana.get_tasks(self.project_ids_to_index, start_time)

        for task in tasks:
            doc = self._message_to_doc(task)
            docs_batch.append(doc)

            if len(docs_batch) >= self.batch_size:
                logger.info(
                    "Yielding batch of " + str(len(docs_batch)) + " documents..."
                )
                yield docs_batch
                docs_batch = []

        if docs_batch:
            logger.info(
                "Yielding final batch of " + str(len(docs_batch)) + " documents..."
            )
            yield docs_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        logger.info("Indexing all tasks")
        return self.poll_source(start=0, end=None)

    def _message_to_doc(self, task: asana_api.AsanaTask) -> Document:
        return Document(
            id=task.id,
            sections=[Section(link=task.link, text=task.text)],
            doc_updated_at=task.last_modified,
            source=DocumentSource.ASANA,
            semantic_identifier=task.title,
            metadata={
                "group": task.project_gid,
                "project": task.project_name,
            },
        )


if __name__ == "__main__":
    import time
    import os

    connector = AsanaConnector(
        os.environ["WORKSPACE_ID"],
        os.environ["PROJECT_IDS"],
        os.environ["TEAM_ID"],
    )
    connector.load_credentials(
        {
            "asana_api_token_secret": os.environ["API_TOKEN"],
        }
    )
    all_docs = connector.load_from_state()
    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 day
    latest_docs = connector.poll_source(one_day_ago, current)
    for doc in latest_docs:
        print(doc)
