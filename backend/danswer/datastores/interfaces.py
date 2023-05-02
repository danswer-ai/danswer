import abc

from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import InferenceChunk

DatastoreFilter = dict[str, str | list[str] | None]


class Datastore:
    @abc.abstractmethod
    def index(self, chunks: list[EmbeddedIndexChunk]) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def semantic_retrieval(
        self, query: str, filters: list[DatastoreFilter] | None, num_to_retrieve: int
    ) -> list[InferenceChunk]:
        raise NotImplementedError
