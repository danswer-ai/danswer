import abc
from collections.abc import Generator
from typing import Any

from danswer.connectors.models import Document


SecondsSinceUnixEpoch = float

GenerateDocumentsOutput = Generator[
    list[Document] | tuple[Generator[list[Document], None, None], str, dict[str, Any]],
    None,
    None,
]


class BaseConnector(abc.ABC):
    @abc.abstractmethod
    def load_credentials(self, credentials: dict[str, Any]) -> None:
        raise NotImplementedError


# Large set update or reindex, generally pulling a complete state or from a savestate file
class LoadConnector(BaseConnector):
    @abc.abstractmethod
    def load_from_state(self) -> GenerateDocumentsOutput:
        raise NotImplementedError


# Small set updates by time
class PollConnector(BaseConnector):
    @abc.abstractmethod
    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        raise NotImplementedError


# Event driven
class EventConnector(BaseConnector):
    @abc.abstractmethod
    def handle_event(self, event: Any) -> GenerateDocumentsOutput:
        raise NotImplementedError
