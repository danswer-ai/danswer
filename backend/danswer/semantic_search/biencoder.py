from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.semantic_search.semantic_search import get_default_embedding_model
from danswer.semantic_search.type_aliases import Embedder
from danswer.utils.logging import setup_logger
from sentence_transformers import SentenceTransformer  # type: ignore


logger = setup_logger()


def encode_chunks(
    chunks: list[IndexChunk],
    embedding_model: SentenceTransformer | None = None,
    batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
) -> list[EmbeddedIndexChunk]:
    embedded_chunks = []
    if embedding_model is None:
        embedding_model = get_default_embedding_model()

    chunk_batches = [
        chunks[i : i + batch_size] for i in range(0, len(chunks), batch_size)
    ]
    for batch_ind, chunk_batch in enumerate(chunk_batches):
        embeddings_batch = embedding_model.encode(
            [chunk.content for chunk in chunk_batch]
        )
        embedded_chunks.extend(
            [
                EmbeddedIndexChunk(
                    **{k: getattr(chunk, k) for k in chunk.__dataclass_fields__},
                    embedding=embeddings_batch[i].tolist()
                )
                for i, chunk in enumerate(chunk_batch)
            ]
        )
    return embedded_chunks


class DefaultEmbedder(Embedder):
    def embed(self, chunks: list[IndexChunk]) -> list[EmbeddedIndexChunk]:
        return encode_chunks(chunks)
