from collections.abc import Callable
from copy import deepcopy
from typing import Any
from typing import cast

import numpy
from nltk.corpus import stopwords  # type:ignore
from nltk.stem import WordNetLemmatizer  # type:ignore
from nltk.tokenize import word_tokenize  # type:ignore
from sentence_transformers import SentenceTransformer  # type: ignore
from sqlalchemy.orm import Session

from danswer.configs.app_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.app_configs import HYBRID_ALPHA
from danswer.configs.app_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MAX
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MIN
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import SIM_SCORE_RANGE_HIGH
from danswer.configs.model_configs import SIM_SCORE_RANGE_LOW
from danswer.db.feedback import create_query_event
from danswer.db.feedback import update_query_event_retrieved_documents
from danswer.db.models import User
from danswer.document_index.document_index_utils import (
    translate_boost_count_to_multiplier,
)
from danswer.document_index.interfaces import DocumentIndex
from danswer.indexing.models import InferenceChunk
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.models import ChunkMetric
from danswer.search.models import IndexFilters
from danswer.search.models import MAX_METRICS_CONTENT
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.models import SearchQuery
from danswer.search.models import SearchType
from danswer.search.search_nlp_models import CrossEncoderEnsembleModel
from danswer.search.search_nlp_models import EmbeddingModel
from danswer.secondary_llm_flows.chunk_usefulness import llm_batch_eval_chunks
from danswer.secondary_llm_flows.query_expansion import rephrase_query
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchDoc
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import FunctionCall
from danswer.utils.threadpool_concurrency import run_functions_in_parallel
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel
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


def embed_query(
    query: str,
    embedding_model: SentenceTransformer | None = None,
    prefix: str = ASYM_QUERY_PREFIX,
    normalize_embeddings: bool = NORMALIZE_EMBEDDINGS,
) -> list[float]:
    model = embedding_model or EmbeddingModel()
    prefixed_query = prefix + query
    query_embedding = model.encode(
        [prefixed_query], normalize_embeddings=normalize_embeddings
    )[0]

    return query_embedding


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


def combine_retrieval_results(
    chunk_sets: list[list[InferenceChunk]],
) -> list[InferenceChunk]:
    all_chunks = [chunk for chunk_set in chunk_sets for chunk in chunk_set]

    unique_chunks: dict[tuple[str, int], InferenceChunk] = {}
    for chunk in all_chunks:
        key = (chunk.document_id, chunk.chunk_id)
        if key not in unique_chunks:
            unique_chunks[key] = chunk
            continue

        stored_chunk_score = unique_chunks[key].score or 0
        this_chunk_score = chunk.score or 0
        if stored_chunk_score < this_chunk_score:
            unique_chunks[key] = chunk

    sorted_chunks = sorted(
        unique_chunks.values(), key=lambda x: x.score or 0, reverse=True
    )

    return sorted_chunks


@log_function_time()
def doc_index_retrieval(
    query: SearchQuery,
    document_index: DocumentIndex,
    hybrid_alpha: float = HYBRID_ALPHA,
) -> list[InferenceChunk]:
    if query.search_type == SearchType.KEYWORD:
        top_chunks = document_index.keyword_retrieval(
            query=query.query,
            filters=query.filters,
            favor_recent=query.favor_recent,
            num_to_retrieve=query.num_hits,
        )

    elif query.search_type == SearchType.SEMANTIC:
        top_chunks = document_index.semantic_retrieval(
            query=query.query,
            filters=query.filters,
            favor_recent=query.favor_recent,
            num_to_retrieve=query.num_hits,
        )

    elif query.search_type == SearchType.HYBRID:
        top_chunks = document_index.hybrid_retrieval(
            query=query.query,
            filters=query.filters,
            favor_recent=query.favor_recent,
            num_to_retrieve=query.num_hits,
            hybrid_alpha=hybrid_alpha,
        )

    else:
        raise RuntimeError("Invalid Search Flow")

    return top_chunks


@log_function_time()
def semantic_reranking(
    query: str,
    chunks: list[InferenceChunk],
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    model_min: int = CROSS_ENCODER_RANGE_MIN,
    model_max: int = CROSS_ENCODER_RANGE_MAX,
) -> tuple[list[InferenceChunk], list[int]]:
    """Reranks chunks based on cross-encoder models. Additionally provides the original indices
    of the chunks in their new sorted order.

    Note: this updates the chunks in place, it updates the chunk scores which came from retrieval
    """
    cross_encoders = CrossEncoderEnsembleModel()
    passages = [chunk.content for chunk in chunks]
    sim_scores_floats = cross_encoders.predict(query=query, passages=passages)

    sim_scores = [numpy.array(scores) for scores in sim_scores_floats]

    raw_sim_scores = cast(numpy.ndarray, sum(sim_scores) / len(sim_scores))

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
    orig_indices = [i for i in range(len(normalized_b_s_scores))]
    scored_results = list(
        zip(normalized_b_s_scores, raw_sim_scores, chunks, orig_indices)
    )
    scored_results.sort(key=lambda x: x[0], reverse=True)
    ranked_sim_scores, ranked_raw_scores, ranked_chunks, ranked_indices = zip(
        *scored_results
    )

    logger.debug(
        f"Reranked (Boosted + Time Weighted) similarity scores: {ranked_sim_scores}"
    )

    # Assign new chunk scores based on reranking
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

    return list(ranked_chunks), list(ranked_indices)


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
    # Need the range of values to not be too spread out for applying boost
    # therefore norm across only the top few results
    norm_cutoff: int = NUM_RERANKED_RESULTS,
    norm_min: float = SIM_SCORE_RANGE_LOW,
    norm_max: float = SIM_SCORE_RANGE_HIGH,
) -> list[InferenceChunk]:
    scores = [chunk.score or 0.0 for chunk in chunks]
    logger.debug(f"Raw similarity scores: {scores}")

    boosts = [translate_boost_count_to_multiplier(chunk.boost) for chunk in chunks]
    recency_multiplier = [chunk.recency_bias for chunk in chunks]

    norm_min = min(norm_min, min(scores[:norm_cutoff]))
    norm_max = max(norm_max, max(scores[:norm_cutoff]))
    # This should never be 0 unless user has done some weird/wrong settings
    norm_range = norm_max - norm_min

    boosted_scores = [
        max(0, (score - norm_min) * boost * recency / norm_range)
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


def search_chunks(
    query: SearchQuery,
    document_index: DocumentIndex,
    hybrid_alpha: float = HYBRID_ALPHA,  # Only applicable to hybrid search
    multilingual_query_expansion: str | None = MULTILINGUAL_QUERY_EXPANSION,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk], list[bool]]:
    """Returns a list of the best chunks from search/reranking and if the chunks are relevant via LLM.
    For sake of speed, the system cannot rerank all retrieved chunks
    Also pass the chunks through LLM to determine if they are relevant (binary for speed)

    Only the first  max_llm_filter_chunks
    """

    def _log_top_chunk_links(search_flow: str, chunks: list[InferenceChunk]) -> None:
        top_links = [
            c.source_links[0] if c.source_links is not None else "No Link"
            for c in chunks
        ]
        logger.info(f"Top links from {search_flow} search: {', '.join(top_links)}")

    # Don't do query expansion on complex queries, rephrasings likely would not work well
    if not multilingual_query_expansion or "\n" in query.query or "\r" in query.query:
        top_chunks = doc_index_retrieval(
            query=query, document_index=document_index, hybrid_alpha=hybrid_alpha
        )
    else:
        run_queries: list[tuple[Callable, tuple]] = []
        # Currently only uses query expansion on multilingual use cases
        query_rephrases = rephrase_query(query.query, multilingual_query_expansion)
        # Just to be extra sure, add the original query.
        query_rephrases.append(query.query)
        for rephrase in set(query_rephrases):
            q_copy = deepcopy(query)
            q_copy.query = rephrase
            run_queries.append(
                (doc_index_retrieval, (q_copy, document_index, hybrid_alpha))
            )
        parallel_search_results = run_functions_tuples_in_parallel(run_queries)
        top_chunks = combine_retrieval_results(parallel_search_results)

    if not top_chunks:
        logger.info(
            f"{query.search_type.value.capitalize()} search returned no results "
            f"with filters: {query.filters}"
        )
        return [], []

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

    functions_to_run: list[FunctionCall] = []

    # Keyword Search should not do reranking
    if query.search_type == SearchType.KEYWORD or query.skip_rerank:
        _log_top_chunk_links(query.search_type.value, top_chunks)
        run_rerank_id: str | None = None
    else:
        run_rerank = FunctionCall(
            semantic_reranking,
            (query.query, top_chunks[: query.num_rerank]),
            {"rerank_metrics_callback": rerank_metrics_callback},
        )
        functions_to_run.append(run_rerank)
        run_rerank_id = run_rerank.result_id

    run_llm_filter_id = None
    if not query.skip_llm_chunk_filter:
        run_llm_filter = FunctionCall(
            llm_batch_eval_chunks,
            (
                query.query,
                [chunk.content for chunk in top_chunks[: query.max_llm_filter_chunks]],
            ),
            {},
        )
        functions_to_run.append(run_llm_filter)
        run_llm_filter_id = run_llm_filter.result_id

    parallel_results: dict[str, Any] = {}
    if functions_to_run:
        parallel_results = run_functions_in_parallel(functions_to_run)

    ranked_results = parallel_results.get(str(run_rerank_id))
    if ranked_results is None:
        ranked_chunks = top_chunks
        sorted_indices = [i for i in range(len(top_chunks))]
    else:
        ranked_chunks, orig_indices = ranked_results
        sorted_indices = orig_indices + list(range(len(orig_indices), len(top_chunks)))
        lower_chunks = top_chunks[query.num_rerank :]
        # Scores from rerank cannot be meaningfully combined with scores without rerank
        for lower_chunk in lower_chunks:
            lower_chunk.score = None
        ranked_chunks.extend(lower_chunks)

    llm_chunk_selection = parallel_results.get(str(run_llm_filter_id))
    if llm_chunk_selection is None:
        reranked_llm_chunk_selection = [True for _ in top_chunks]
    else:
        llm_chunk_selection.extend(
            [False for _ in top_chunks[query.max_llm_filter_chunks :]]
        )
        reranked_llm_chunk_selection = [
            llm_chunk_selection[ind] for ind in sorted_indices
        ]
    _log_top_chunk_links(query.search_type.value, ranked_chunks)

    return ranked_chunks, reranked_llm_chunk_selection


def danswer_search(
    question: QuestionRequest,
    user: User | None,
    db_session: Session,
    document_index: DocumentIndex,
    skip_llm_chunk_filter: bool = DISABLE_LLM_CHUNK_FILTER,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk], list[bool], int]:
    query_event_id = create_query_event(
        query=question.query,
        search_type=question.search_type,
        llm_answer=None,
        user_id=user.id if user is not None else None,
        db_session=db_session,
    )

    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=question.filters.source_type,
        document_set=question.filters.document_set,
        time_cutoff=question.filters.time_cutoff,
        access_control_list=user_acl_filters,
    )

    search_query = SearchQuery(
        query=question.query,
        search_type=question.search_type,
        filters=final_filters,
        # Still applies time decay but not magnified
        favor_recent=question.favor_recent
        if question.favor_recent is not None
        else False,
        skip_llm_chunk_filter=skip_llm_chunk_filter,
    )

    top_chunks, llm_chunk_selection = search_chunks(
        query=search_query,
        document_index=document_index,
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )

    retrieved_ids = [doc.document_id for doc in top_chunks] if top_chunks else []

    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=retrieved_ids,
        query_id=query_event_id,
        user_id=None if user is None else user.id,
    )

    return top_chunks, llm_chunk_selection, query_event_id
