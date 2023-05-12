import abc
from collections.abc import Generator
from typing import Any
from typing import List

from danswer.connectors.models import Document


SecondsSinceUnixEpoch = float


class PullLoader:
    @abc.abstractmethod
    def load(self) -> Generator[List[Document], None, None]:
        raise NotImplementedError


class RangePullLoader:
    @abc.abstractmethod
    def load(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[List[Document], None, None]:
        raise NotImplementedError


class PushLoader:
    @abc.abstractmethod
    def load(self, event: Any) -> Generator[List[Document], None, None]:
        raise NotImplementedError
