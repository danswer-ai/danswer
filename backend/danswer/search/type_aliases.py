from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk


class Embedder:
    def embed(self, chunks: list[IndexChunk]) -> list[EmbeddedIndexChunk]:
        raise NotImplementedError
