import json
from uuid import UUID

import numpy
from sentence_transformers import SentenceTransformer  # type: ignore

from danswer.chunking.models import ChunkEmbedding
from danswer.chunking.models import DocAwareChunk
from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import ENABLE_MINI_CHUNK
from danswer.configs.app_configs import MINI_CHUNK_SIZE
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import ASYMMETRIC_PREFIX
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.datastores.datastore_utils import translate_boost_count_to_multiplier
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import IndexFilter
from danswer.search.models import Embedder
from danswer.search.search_utils import get_default_embedding_model
from danswer.search.search_utils import get_default_reranking_model_ensemble
from danswer.server.models import SearchDoc
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


def chunks_to_search_docs(chunks: list[InferenceChunk] | None) -> list[SearchDoc]:
    search_docs = (
        [
            SearchDoc(
                document_id=chunk.document_id,
                semantic_identifier=chunk.semantic_identifier,
                link=chunk.source_links.get(0) if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
                boost=chunk.boost,
                score=chunk.score,
            )
            # semantic identifier should always exist but for really old indices, it was not enforced
            for chunk in chunks
            if chunk.semantic_identifier
        ]
        if chunks
        else []
    )
    return search_docs


@log_function_time()
def semantic_reranking(
    query: str,
    chunks: list[InferenceChunk],
) -> list[InferenceChunk]:
    cross_encoders = get_default_reranking_model_ensemble()
    sim_scores = [
        encoder.predict([(query, chunk.content) for chunk in chunks])  # type: ignore
        for encoder in cross_encoders
    ]

    shifted_sim_scores = sum(
        [enc_n_scores - numpy.min(enc_n_scores) for enc_n_scores in sim_scores]
    ) / len(sim_scores)

    boosts = [translate_boost_count_to_multiplier(chunk.boost) for chunk in chunks]
    boosted_sim_scores = shifted_sim_scores * boosts
    scored_results = list(zip(boosted_sim_scores, chunks))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_chunks = zip(*scored_results)

    logger.debug(f"Reranked similarity scores: {ranked_sim_scores}")

    # Assign new chunk scores based on reranking
    # TODO if pagination is added, the scores won't make sense with respect to the non-reranked hits
    for ind, chunk in enumerate(ranked_chunks):
        chunk.score = ranked_sim_scores[ind]

    return list(ranked_chunks)


@log_function_time()
def retrieve_ranked_documents(
    query: str,
    user_id: UUID | None,
    filters: list[IndexFilter] | None,
    datastore: DocumentIndex,
    num_hits: int = NUM_RETURNED_HITS,
    num_rerank: int = NUM_RERANKED_RESULTS,
) -> tuple[list[InferenceChunk] | None, list[InferenceChunk] | None]:
    """Uses vector similarity to fetch the top num_hits document chunks with a distance cutoff.
    Reranks the top num_rerank out of those (instead of all due to latency)"""
    top_chunks = datastore.semantic_retrieval(query, user_id, filters, num_hits)
    if not top_chunks:
        filters_log_msg = json.dumps(filters, separators=(",", ":")).replace("\n", "")
        logger.warning(
            f"Semantic search returned no results with filters: {filters_log_msg}"
        )
        return None, None
    logger.info(top_chunks)
    ranked_chunks = semantic_reranking(query, top_chunks[:num_rerank])

    top_docs = [
        ranked_chunk.source_links[0]
        for ranked_chunk in ranked_chunks
        if ranked_chunk.source_links is not None
    ]

    files_log_msg = (
        f"Top links from semantic search: {', '.join(list(dict.fromkeys(top_docs)))}"
    )
    logger.info(files_log_msg)

    return ranked_chunks, top_chunks[num_rerank:]


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
    chunks: list[DocAwareChunk],
    embedding_model: SentenceTransformer | None = None,
    batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
    enable_mini_chunk: bool = ENABLE_MINI_CHUNK,
) -> list[IndexChunk]:
    embedded_chunks: list[IndexChunk] = []
    if embedding_model is None:
        embedding_model = get_default_embedding_model()

    chunk_texts = []
    chunk_mini_chunks_count = {}
    for chunk_ind, chunk in enumerate(chunks):
        chunk_texts.append(chunk.content)
        mini_chunk_texts = (
            split_chunk_text_into_mini_chunks(chunk.content)
            if enable_mini_chunk
            else []
        )
        chunk_texts.extend(mini_chunk_texts)
        chunk_mini_chunks_count[chunk_ind] = 1 + len(mini_chunk_texts)

    text_batches = [
        chunk_texts[i : i + batch_size] for i in range(0, len(chunk_texts), batch_size)
    ]

    embeddings_np: list[numpy.ndarray] = []
    for text_batch in text_batches:
        # Normalize embeddings is only configured via model_configs.py, be sure to use right value for the set loss
        embeddings_np.extend(
            embedding_model.encode(
                text_batch, normalize_embeddings=NORMALIZE_EMBEDDINGS
            )
        )
    embeddings: list[list[float]] = [embedding.tolist() for embedding in embeddings_np]

    embedding_ind_start = 0
    for chunk_ind, chunk in enumerate(chunks):
        num_embeddings = chunk_mini_chunks_count[chunk_ind]
        chunk_embeddings = embeddings[
            embedding_ind_start : embedding_ind_start + num_embeddings
        ]
        new_embedded_chunk = IndexChunk(
            **{k: getattr(chunk, k) for k in chunk.__dataclass_fields__},
            embeddings=ChunkEmbedding(
                full_embedding=chunk_embeddings[0],
                mini_chunk_embeddings=chunk_embeddings[1:],
            ),
        )
        embedded_chunks.append(new_embedded_chunk)
        embedding_ind_start += num_embeddings

    return embedded_chunks


def embed_query(
    query: str,
    embedding_model: SentenceTransformer | None = None,
    prefix: str = ASYMMETRIC_PREFIX,
    normalize_embeddings: bool = NORMALIZE_EMBEDDINGS,
) -> list[float]:
    model = embedding_model or get_default_embedding_model()
    prefixed_query = prefix + query
    query_embedding = model.encode(
        prefixed_query, normalize_embeddings=normalize_embeddings
    )

    if not isinstance(query_embedding, list):
        query_embedding = query_embedding.tolist()

    return query_embedding


class DefaultEmbedder(Embedder):
    def embed(self, chunks: list[DocAwareChunk]) -> list[IndexChunk]:
        return encode_chunks(chunks)
