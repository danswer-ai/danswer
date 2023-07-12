from typing import Any

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.utils.logging import setup_logger

# Potential Improvements
# 1. Support fetching per collection via collection token (configured at connector creation)

GURU_API_BASE = "https://api.getguru.com/api/v1/"
logger = setup_logger()


class GuruConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        guru_user_token: str | None = None,
    ) -> None:
        self.batch_size = batch_size
        self.guru_user_token = guru_user_token

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.guru_user_token = credentials["guru_user_token"]
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.guru_user_token is None:
            raise ConnectorMissingCredentialError("Guru")

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.guru_user_token is None:
            raise ConnectorMissingCredentialError("Guru")


if __name__ == "__main__":
    c = GuruConnector()
    c.load_from_state()
