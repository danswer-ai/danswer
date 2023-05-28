import numpy
from danswer.chunking.models import EmbeddedIndexChunk
from danswer.chunking.models import IndexChunk
from danswer.configs.app_configs import ENABLE_MINI_BATCH
from danswer.configs.app_configs import MINI_CHUNK_SIZE
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.semantic_search.semantic_search import get_default_embedding_model
from danswer.semantic_search.type_aliases import Embedder
from danswer.utils.logging import setup_logger
from danswer.utils.timing import log_function_time
from sentence_transformers import SentenceTransformer  # type: ignore


logger = setup_logger()


def split_chunk_text_into_mini_chunks(
    chunk_text: str, mini_chunk_size: int = MINI_CHUNK_SIZE
) -> list[str]:
    chunks = []
    start = 0
    separators = [" ", "\n", "\r", "\t"]

    while start < len(chunk_text):
        if len(chunk_text) - start <= mini_chunk_size:
            end = len(chunk_text)
        else:
            # Find the first separator character after min_chunk_length
            end_positions = [
                (chunk_text[start + mini_chunk_size :]).find(sep) for sep in separators
            ]
            # Filter out the not found cases (-1)
            end_positions = [pos for pos in end_positions if pos != -1]
            if not end_positions:
                # If no more separators, the rest of the string becomes a chunk
                end = len(chunk_text)
            else:
                # Add min_chunk_length and start to the end position
                end = min(end_positions) + start + mini_chunk_size

        chunks.append(chunk_text[start:end])
        start = end + 1  # Move to the next character after the separator

    return chunks


@log_function_time()
def encode_chunks(
    chunks: list[IndexChunk],
    embedding_model: SentenceTransformer | None = None,
    batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
    enable_mini_batch: bool = ENABLE_MINI_BATCH,
) -> list[EmbeddedIndexChunk]:
    embedded_chunks: list[EmbeddedIndexChunk] = []
    if embedding_model is None:
        embedding_model = get_default_embedding_model()

    chunk_texts = []
    chunk_mini_chunks_count = {}
    for chunk_ind, chunk in enumerate(chunks):
        chunk_texts.append(chunk.content)
        mini_chunk_texts = (
            split_chunk_text_into_mini_chunks(chunk.content)
            if enable_mini_batch
            else []
        )
        chunk_texts.extend(mini_chunk_texts)
        chunk_mini_chunks_count[chunk_ind] = 1 + len(mini_chunk_texts)

    text_batches = [
        chunk_texts[i : i + batch_size] for i in range(0, len(chunk_texts), batch_size)
    ]

    embeddings_np: list[numpy.ndarray] = []
    for text_batch in text_batches:
        embeddings_np.extend(embedding_model.encode(text_batch))
    embeddings: list[list[float]] = [embedding.tolist() for embedding in embeddings_np]

    embedding_ind_start = 0
    for chunk_ind, chunk in enumerate(chunks):
        num_embeddings = chunk_mini_chunks_count[chunk_ind]
        chunk_embeddings = embeddings[
            embedding_ind_start : embedding_ind_start + num_embeddings
        ]
        new_embedded_chunk = EmbeddedIndexChunk(
            **{k: getattr(chunk, k) for k in chunk.__dataclass_fields__},
            embeddings=chunk_embeddings
        )
        embedded_chunks.append(new_embedded_chunk)
        embedding_ind_start += num_embeddings

    return embedded_chunks


class DefaultEmbedder(Embedder):
    def embed(self, chunks: list[IndexChunk]) -> list[EmbeddedIndexChunk]:
        return encode_chunks(chunks)
