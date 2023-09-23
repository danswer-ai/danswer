import json
from collections.abc import Callable
from uuid import UUID

import numpy
from sentence_transformers import SentenceTransformer  # type: ignore

from danswer.chunking.chunk import split_chunk_text_into_mini_chunks
from danswer.chunking.models import ChunkEmbedding
from danswer.chunking.models import DocAwareChunk
from danswer.chunking.models import IndexChunk
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import ENABLE_MINI_CHUNK
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import BATCH_SIZE_ENCODE_CHUNKS
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import SIM_SCORE_RANGE_HIGH
from danswer.configs.model_configs import SIM_SCORE_RANGE_LOW
from danswer.configs.model_configs import SKIP_RERANKING
from danswer.datastores.datastore_utils import translate_boost_count_to_multiplier
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import IndexFilter
from danswer.search.models import ChunkMetric
from danswer.search.models import Embedder
from danswer.search.models import MAX_METRICS_CONTENT
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
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
                match_highlights=chunk.match_highlights,
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
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> list[InferenceChunk]:
    model_max = 12  # These are just based on observations from model selection
    model_min = -12
    cross_encoders = get_default_reranking_model_ensemble()
    sim_scores = [
        encoder.predict([(query, chunk.content) for chunk in chunks])  # type: ignore
        for encoder in cross_encoders
    ]

    raw_sim_scores = sum(sim_scores) / len(sim_scores)

    cross_models_min = numpy.min(sim_scores)

    shifted_sim_scores = sum(
        [enc_n_scores - cross_models_min for enc_n_scores in sim_scores]
    ) / len(sim_scores)

    boosts = [translate_boost_count_to_multiplier(chunk.boost) for chunk in chunks]
    boosted_sim_scores = shifted_sim_scores * boosts
    normalized_b_s_scores = (boosted_sim_scores + cross_models_min - model_min) / (
        model_max - model_min
    )
    scored_results = list(zip(normalized_b_s_scores, raw_sim_scores, chunks))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_raw_scores, ranked_chunks = zip(*scored_results)

    logger.debug(f"Reranked similarity scores: {ranked_sim_scores}")

    # Assign new chunk scores based on reranking
    # TODO if pagination is added, the scores won't make sense with respect to the non-reranked hits
    for ind, chunk in enumerate(ranked_chunks):
        chunk.score = ranked_sim_scores[ind]

    if rerank_metrics_callback is not None:
        chunk_metrics = [
            ChunkMetric(
                document_id=chunk.document_id,
                chunk_content_start=chunk.content[:MAX_METRICS_CONTENT],
                first_link=chunk.source_links[0] if chunk.source_links else None,
                score=chunk.score if chunk.score is not None else 0,
            )
            for chunk in ranked_chunks
        ]

        rerank_metrics_callback(
            RerankMetricsContainer(
                metrics=chunk_metrics, raw_similarity_scores=ranked_raw_scores
            )
        )

    return list(ranked_chunks)


def apply_boost(
    chunks: list[InferenceChunk],
    norm_min: float = SIM_SCORE_RANGE_LOW,
    norm_max: float = SIM_SCORE_RANGE_HIGH,
) -> list[InferenceChunk]:
    scores = [chunk.score or 0 for chunk in chunks]
    boosts = [translate_boost_count_to_multiplier(chunk.boost) for chunk in chunks]

    logger.debug(f"Raw similarity scores: {scores}")

    score_min = min(scores)
    score_max = max(scores)
    score_range = score_max - score_min

    boosted_scores = [
        ((score - score_min) / score_range) * boost
        for score, boost in zip(scores, boosts)
    ]

    unnormed_boosted_scores = [
        score * score_range + score_min for score in boosted_scores
    ]

    norm_min = min(norm_min, min(scores))
    norm_max = max(norm_max, max(scores))

    # For score display purposes
    re_normed_scores = [
        ((score - norm_min) / (norm_max - norm_min))
        for score in unnormed_boosted_scores
    ]

    rescored_chunks = list(zip(re_normed_scores, chunks))
    rescored_chunks.sort(key=lambda x: x[0], reverse=True)
    sorted_boosted_scores, boost_sorted_chunks = zip(*rescored_chunks)

    final_chunks = list(boost_sorted_chunks)
    final_scores = list(sorted_boosted_scores)
    for ind, chunk in enumerate(final_chunks):
        chunk.score = final_scores[ind]

    logger.debug(f"Boost sorted similary scores: {list(final_scores)}")

    return final_chunks


@log_function_time()
def retrieve_ranked_documents(
    query: str,
    user_id: UUID | None,
    filters: list[IndexFilter] | None,
    datastore: DocumentIndex,
    num_hits: int = NUM_RETURNED_HITS,
    num_rerank: int = NUM_RERANKED_RESULTS,
    skip_rerank: bool = SKIP_RERANKING,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk] | None, list[InferenceChunk] | None]:
    """Uses vector similarity to fetch the top num_hits document chunks with a distance cutoff.
    Reranks the top num_rerank out of those (instead of all due to latency)"""

    def _log_top_chunk_links(chunks: list[InferenceChunk]) -> None:
        doc_links = [c.source_links[0] for c in chunks if c.source_links is not None]

        files_log_msg = f"Top links from semantic search: {', '.join(doc_links)}"
        logger.info(files_log_msg)

    top_chunks = datastore.semantic_retrieval(query, user_id, filters, num_hits)
    if not top_chunks:
        filters_log_msg = json.dumps(filters, separators=(",", ":")).replace("\n", "")
        logger.warning(
            f"Semantic search returned no results with filters: {filters_log_msg}"
        )
        return None, None
    logger.debug(top_chunks)

    if retrieval_metrics_callback is not None:
        chunk_metrics = [
            ChunkMetric(
                document_id=chunk.document_id,
                chunk_content_start=chunk.content[:MAX_METRICS_CONTENT],
                first_link=chunk.source_links[0] if chunk.source_links else None,
                score=chunk.score if chunk.score is not None else 0,
            )
            for chunk in top_chunks
        ]
        retrieval_metrics_callback(
            RetrievalMetricsContainer(keyword_search=True, metrics=chunk_metrics)
        )

    if skip_rerank:
        # Need the range of values to not be too spread out for applying boost
        boosted_chunks = apply_boost(top_chunks[:num_rerank])
        _log_top_chunk_links(boosted_chunks)
        return boosted_chunks, top_chunks[num_rerank:]

    ranked_chunks = (
        semantic_reranking(
            query,
            top_chunks[:num_rerank],
            rerank_metrics_callback=rerank_metrics_callback,
        )
        if not skip_rerank
        else []
    )

    _log_top_chunk_links(ranked_chunks)

    return ranked_chunks, top_chunks[num_rerank:]


@log_function_time()
def encode_chunks(
    chunks: list[DocAwareChunk],
    embedding_model: SentenceTransformer | None = None,
    batch_size: int = BATCH_SIZE_ENCODE_CHUNKS,
    enable_mini_chunk: bool = ENABLE_MINI_CHUNK,
    passage_prefix: str = ASYM_PASSAGE_PREFIX,
) -> list[IndexChunk]:
    embedded_chunks: list[IndexChunk] = []
    if embedding_model is None:
        embedding_model = get_default_embedding_model()

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
    prefix: str = ASYM_QUERY_PREFIX,
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
