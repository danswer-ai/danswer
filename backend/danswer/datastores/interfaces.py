import abc

from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import InferenceChunk


class Datastore:
    @abc.abstractmethod
    def index(self, chunks: list[EmbeddedIndexChunk]) -> bool:
        raise NotImplementedError

    @abc.abstractmethod
    def search(self, query: str, num_to_retrieve: int) -> list[InferenceChunk]:
        raise NotImplementedError
