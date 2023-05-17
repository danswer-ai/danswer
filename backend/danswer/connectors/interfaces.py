import abc
from collections.abc import Generator
from typing import Any

from danswer.connectors.models import Document


SecondsSinceUnixEpoch = float


# TODO (chris): rename from Loader -> Connector
class PullLoader:
    @abc.abstractmethod
    def load(self) -> Generator[list[Document], None, None]:
        raise NotImplementedError


class RangePullLoader:
    @abc.abstractmethod
    def load(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[list[Document], None, None]:
        raise NotImplementedError


class PushLoader:
    @abc.abstractmethod
    def load(self, event: Any) -> Generator[list[Document], None, None]:
        raise NotImplementedError
