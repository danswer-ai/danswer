from collections.abc import Callable

import numpy
from nltk.corpus import stopwords  # type:ignore
from nltk.stem import WordNetLemmatizer  # type:ignore
from nltk.tokenize import word_tokenize  # type:ignore
from sentence_transformers import SentenceTransformer  # type: ignore

from danswer.configs.app_configs import EDIT_KEYWORD_QUERY
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.app_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MAX
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MIN
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import SIM_SCORE_RANGE_HIGH
from danswer.configs.model_configs import SIM_SCORE_RANGE_LOW
from danswer.configs.model_configs import SKIP_RERANKING
from danswer.document_index.document_index_utils import (
    translate_boost_count_to_multiplier,
)
from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.interfaces import IndexFilters
from danswer.indexing.models import InferenceChunk
from danswer.search.models import ChunkMetric
from danswer.search.models import MAX_METRICS_CONTENT
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.search_nlp_models import get_default_embedding_model
from danswer.search.search_nlp_models import get_default_reranking_model_ensemble
from danswer.server.models import SearchDoc
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


def lemmatize_text(text: str) -> list[str]:
    lemmatizer = WordNetLemmatizer()
    word_tokens = word_tokenize(text)
    return [lemmatizer.lemmatize(word) for word in word_tokens]


def remove_stop_words(text: str) -> list[str]:
    stop_words = set(stopwords.words("english"))
    word_tokens = word_tokenize(text)
    text_trimmed = [word for word in word_tokens if word.casefold() not in stop_words]
    return text_trimmed or word_tokens


def query_processing(
    query: str,
) -> str:
    query = " ".join(remove_stop_words(query))
    query = " ".join(lemmatize_text(query))
    return query


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
                hidden=chunk.hidden,
                score=chunk.score,
                match_highlights=chunk.match_highlights,
                updated_at=chunk.updated_at,
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
    model_min: int = CROSS_ENCODER_RANGE_MIN,
    model_max: int = CROSS_ENCODER_RANGE_MAX,
) -> list[InferenceChunk]:
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
    recency_multiplier = [chunk.recency_bias for chunk in chunks]
    boosted_sim_scores = shifted_sim_scores * boosts * recency_multiplier
    normalized_b_s_scores = (boosted_sim_scores + cross_models_min - model_min) / (
        model_max - model_min
    )
    scored_results = list(zip(normalized_b_s_scores, raw_sim_scores, chunks))
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_raw_scores, ranked_chunks = zip(*scored_results)

    logger.debug(
        f"Reranked (Boosted + Time Weighted) similarity scores: {ranked_sim_scores}"
    )

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


def apply_boost_legacy(
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

    if score_range != 0:
        boosted_scores = [
            ((score - score_min) / score_range) * boost
            for score, boost in zip(scores, boosts)
        ]
        unnormed_boosted_scores = [
            score * score_range + score_min for score in boosted_scores
        ]
    else:
        unnormed_boosted_scores = [
            score * boost for score, boost in zip(scores, boosts)
        ]

    norm_min = min(norm_min, min(scores))
    norm_max = max(norm_max, max(scores))
    # This should never be 0 unless user has done some weird/wrong settings
    norm_range = norm_max - norm_min

    # For score display purposes
    if norm_range != 0:
        re_normed_scores = [
            ((score - norm_min) / norm_range) for score in unnormed_boosted_scores
        ]
    else:
        re_normed_scores = unnormed_boosted_scores

    rescored_chunks = list(zip(re_normed_scores, chunks))
    rescored_chunks.sort(key=lambda x: x[0], reverse=True)
    sorted_boosted_scores, boost_sorted_chunks = zip(*rescored_chunks)

    final_chunks = list(boost_sorted_chunks)
    final_scores = list(sorted_boosted_scores)
    for ind, chunk in enumerate(final_chunks):
        chunk.score = final_scores[ind]

    logger.debug(f"Boost sorted similary scores: {list(final_scores)}")

    return final_chunks


def apply_boost(
    chunks: list[InferenceChunk],
    norm_min: float = SIM_SCORE_RANGE_LOW,
    norm_max: float = SIM_SCORE_RANGE_HIGH,
) -> list[InferenceChunk]:
    scores = [chunk.score or 0.0 for chunk in chunks]
    logger.debug(f"Raw similarity scores: {scores}")

    boosts = [translate_boost_count_to_multiplier(chunk.boost) for chunk in chunks]
    recency_multiplier = [chunk.recency_bias for chunk in chunks]

    norm_min = min(norm_min, min(scores))
    norm_max = max(norm_max, max(scores))
    # This should never be 0 unless user has done some weird/wrong settings
    norm_range = norm_max - norm_min

    boosted_scores = [
        (score - norm_min) * boost * recency / norm_range
        for score, boost, recency in zip(scores, boosts, recency_multiplier)
    ]

    rescored_chunks = list(zip(boosted_scores, chunks))
    rescored_chunks.sort(key=lambda x: x[0], reverse=True)
    sorted_boosted_scores, boost_sorted_chunks = zip(*rescored_chunks)

    final_chunks = list(boost_sorted_chunks)
    final_scores = list(sorted_boosted_scores)
    for ind, chunk in enumerate(final_chunks):
        chunk.score = final_scores[ind]

    logger.debug(
        f"Boosted + Time Weighted sorted similarity scores: {list(final_scores)}"
    )

    return final_chunks


@log_function_time()
def retrieve_keyword_documents(
    query: str,
    filters: IndexFilters,
    favor_recent: bool,
    datastore: DocumentIndex,
    num_hits: int = NUM_RETURNED_HITS,
    edit_query: bool = EDIT_KEYWORD_QUERY,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
) -> list[InferenceChunk] | None:
    edited_query = query_processing(query) if edit_query else query

    top_chunks = datastore.keyword_retrieval(
        edited_query, filters, favor_recent, num_hits
    )

    if not top_chunks:
        logger.warning(
            f"Keyword search returned no results - Filters: {filters}\tEdited Query: {edited_query}"
        )
        return None

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

    return top_chunks


@log_function_time()
def retrieve_ranked_documents(
    query: str,
    filters: IndexFilters,
    favor_recent: bool,
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

    top_chunks = datastore.semantic_retrieval(query, filters, favor_recent, num_hits)
    if not top_chunks:
        logger.info(f"Semantic search returned no results with filters: {filters}")
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
