import abc
from collections.abc import Callable
from collections.abc import Generator
from datetime import datetime
from typing import Any
from typing import List
from typing import Optional

from danswer.connectors.models import Document


ConnectorConfig = dict[str, Any]

# takes in the raw representation of a document from a source and returns a
# Document object
ProcessDocumentFunc = Callable[..., Document]
BuildListenerFunc = Callable[[ConnectorConfig], ProcessDocumentFunc]


# TODO (chris) refactor definition of a connector to match `InputType`
# + make them all async-based
class BatchLoader:
    @abc.abstractmethod
    def load(self) -> Generator[List[Document], None, None]:
        raise NotImplementedError


SecondsSinceUnixEpoch = int


class PullLoader:
    @abc.abstractmethod
    def load(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[List[Document], None, None]:
        raise NotImplementedError


# Fetches raw representations from a specific source for the specified time
# range. Is used when the source does not support subscriptions to some sort
# of event stream
# TODO: use Protocol instead of Callable
TimeRangeBasedLoad = Callable[[datetime, datetime], list[Any]]
