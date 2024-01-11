from sentence_transformers import SentenceTransformer  # type: ignore

from danswer.configs.app_configs import ENABLE_MINI_CHUNK
from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.indexing.chunker import split_chunk_text_into_mini_chunks
from danswer.indexing.models import ChunkEmbedding
from danswer.indexing.models import DocAwareChunk
from danswer.indexing.models import IndexChunk
from danswer.search.models import Embedder
from danswer.search.search_nlp_models import EmbeddingModel
from danswer.utils.logger import setup_logger

logger = setup_logger()


def embed_chunks(
    chunks: list[DocAwareChunk],
    embedding_model: SentenceTransformer | None = None,
    batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
    enable_mini_chunk: bool = ENABLE_MINI_CHUNK,
    passage_prefix: str = ASYM_PASSAGE_PREFIX,
) -> list[IndexChunk]:
    # Cache the Title embeddings to only have to do it once
    title_embed_dict: dict[str, list[float]] = {}

    embedded_chunks: list[IndexChunk] = []
    if embedding_model is None:
        embedding_model = EmbeddingModel()

    chunk_texts = []
    chunk_mini_chunks_count = {}
    for chunk_ind, chunk in enumerate(chunks):
        chunk_texts.append(passage_prefix + chunk.content)
        mini_chunk_texts = (
            split_chunk_text_into_mini_chunks(chunk.content)
            if enable_mini_chunk
            else []
        )
        prefixed_mini_chunk_texts = [passage_prefix + text for text in mini_chunk_texts]
        chunk_texts.extend(prefixed_mini_chunk_texts)
        chunk_mini_chunks_count[chunk_ind] = 1 + len(prefixed_mini_chunk_texts)

    text_batches = [
        chunk_texts[i : i + batch_size] for i in range(0, len(chunk_texts), batch_size)
    ]

    embeddings: list[list[float]] = []
    len_text_batches = len(text_batches)
    for idx, text_batch in enumerate(text_batches, start=1):
        logger.debug(f"Embedding text batch {idx} of {len_text_batches}")
        # Normalize embeddings is only configured via model_configs.py, be sure to use right value for the set loss
        embeddings.extend(embedding_model.encode(text_batch))

        # Replace line above with the line below for easy debugging of indexing flow, skipping the actual model
        # embeddings.extend([[0.0] * 384 for _ in range(len(text_batch))])

    embedding_ind_start = 0
    for chunk_ind, chunk in enumerate(chunks):
        num_embeddings = chunk_mini_chunks_count[chunk_ind]
        chunk_embeddings = embeddings[
            embedding_ind_start : embedding_ind_start + num_embeddings
        ]

        title = chunk.source_document.get_title_for_document_index()

        title_embedding = None
        if title:
            if title in title_embed_dict:
                title_embedding = title_embed_dict[title]
            else:
                title_embedding = embedding_model.encode([title])[0]
                title_embed_dict[title] = title_embedding

        new_embedded_chunk = IndexChunk(
            **{k: getattr(chunk, k) for k in chunk.__dataclass_fields__},
            embeddings=ChunkEmbedding(
                full_embedding=chunk_embeddings[0],
                mini_chunk_embeddings=chunk_embeddings[1:],
            ),
            title_embedding=title_embedding,
        )
        embedded_chunks.append(new_embedded_chunk)
        embedding_ind_start += num_embeddings

    return embedded_chunks


class DefaultEmbedder(Embedder):
    def embed(self, chunks: list[DocAwareChunk]) -> list[IndexChunk]:
        return embed_chunks(chunks)
