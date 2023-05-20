import abc
from collections.abc import Generator
from typing import Any

from danswer.connectors.models import Document


SecondsSinceUnixEpoch = float


class BaseConnector(abc.ABC):
    # Reserved for future shared uses
    pass


# Load from a savestate of a set of files, typically large batch or reindex
class LoadConnector(BaseConnector):
    @abc.abstractmethod
    def load_from_state(self) -> Generator[list[Document], None, None]:
        raise NotImplementedError


# Pulls an update, typically by connecting and getting a smaller batch by timestamp
class PullConnector(BaseConnector):
    @abc.abstractmethod
    def pull_from_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[list[Document], None, None]:
        raise NotImplementedError


# Event driven, connector sends an update to Danswer to handle
class EventConnector(BaseConnector):
    @abc.abstractmethod
    def handle_event(self, event: Any) -> Generator[list[Document], None, None]:
        raise NotImplementedError
