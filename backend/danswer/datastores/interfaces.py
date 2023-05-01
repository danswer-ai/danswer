import abc
from typing import Any

from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import InferenceChunk


class Datastore:
    @abc.abstractmethod
    def index(self, chunks: list[EmbeddedIndexChunk]) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def semantic_retrieval(
        self, query: str, filters: dict[str, Any] | None, num_to_retrieve: int
    ) -> list[InferenceChunk]:
        raise NotImplementedError
