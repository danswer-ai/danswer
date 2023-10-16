from datetime import datetime
from datetime import timezone
from typing import Any
from typing import List
from typing import Optional
from rt.rest1 import Rt
from rt.rest1 import ALL_QUEUES
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section


class RequestTrackerConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        base_url: str,
        queues: List[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
        rt_username: Optional[str] = None,
        rt_password: Optional[str] = None,
    ) -> None:
        self.queues = queues
        self.base_url = base_url
        self.batch_size = batch_size
        self.rt_username = rt_username
        self.rt_password = rt_password

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.rt_username = credentials.get("requesttracker_username")
        self.rt_password = credentials.get("requesttracker_password")
        return None

    def _process_tickets(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.rt_username is None or self.rt_password is None:
            raise ConnectorMissingCredentialError("requesttracker")

        Rt0 = Rt(
            f"{self.base_url}/REST/1.0/",
            self.rt_username,
            self.rt_password,
        )

        Rt0.login()

        d0 = start.strftime("%Y-%m-%d")
        d1 = end.strftime("%Y-%m-%d")

        tickets = Rt0.search(
            Queue=ALL_QUEUES,
            raw_query=f"Updated > '{d0}' AND Updated < '{d1}'",
        )

        doc_batch: List[Document] = []

        for ticket in tickets:
            print(ticket)
            # ... and get the history
            # document = Document(
            #    id=x,
            #    sections=[],
            #    source=DocumentSource.DOCUMENT360,
            #    semantic_identifier=
            #    metadata={},
            # )

            # doc_batch.append(document)

            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_tickets()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start, tz=timezone.utc)
        end_datetime = datetime.fromtimestamp(end, tz=timezone.utc)
        return self._process_tickets(start_datetime, end_datetime)


if __name__ == "__main__":
    import time
    import os
    from dotenv import load_dotenv

    load_dotenv()

    rt_connector = RequestTrackerConnector("https://help.hmdc.harvard.edu")
    rt_connector.load_credentials(
        {
            "requesttracker_username": os.getenv("RT_USERNAME"),
            "requesttracker_password": os.getenv("RT_PASSWORD"),
        }
    )

    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 days
    latest_docs = rt_connector.poll_source(one_day_ago, current)

    for doc in latest_docs:
        print(doc)
