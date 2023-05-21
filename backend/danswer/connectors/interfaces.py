import abc
from collections.abc import Generator
from typing import Any

from danswer.connectors.models import Document


SecondsSinceUnixEpoch = float


class BaseConnector(abc.ABC):
    # Reserved for future shared uses
    pass


# Large set update or reindex, generally pulling a complete state or from a savestate file
class LoadConnector(BaseConnector):
    @abc.abstractmethod
    def load_from_state(self) -> Generator[list[Document], None, None]:
        raise NotImplementedError


# Small set updates by time
class PollConnector(BaseConnector):
    @abc.abstractmethod
    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[list[Document], None, None]:
        raise NotImplementedError


# Event driven
class EventConnector(BaseConnector):
    @abc.abstractmethod
    def handle_event(self, event: Any) -> Generator[list[Document], None, None]:
        raise NotImplementedError
