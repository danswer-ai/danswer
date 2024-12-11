from abc import ABC
from abc import abstractmethod


class IndexingHeartbeatInterface(ABC):
    """Defines a callback interface to be passed to
    to run_indexing_entrypoint."""

    @abstractmethod
    def should_stop(self) -> bool:
        """Signal to stop the looping function in flight."""

    @abstractmethod
    def progress(self, tag: str, amount: int) -> None:
        """Send progress updates to the caller.
        Send 0 for the amount if you just want to do a keep alive ping."""
