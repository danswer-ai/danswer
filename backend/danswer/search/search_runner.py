from collections.abc import Callable

import numpy
from nltk.corpus import stopwords  # type:ignore
from nltk.stem import WordNetLemmatizer  # type:ignore
from nltk.tokenize import word_tokenize  # type:ignore
from sentence_transformers import SentenceTransformer  # type: ignore
from sqlalchemy.orm import Session

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
from danswer.search.search_nlp_models import get_default_embedding_model
from danswer.search.search_nlp_models import get_default_reranking_model_ensemble
from danswer.server.models import QuestionRequest
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


def search_chunks(
    query: SearchQuery,
    document_index: DocumentIndex,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk] | None, list[InferenceChunk] | None]:
    def _log_top_chunk_links(search_flow: str, chunks: list[InferenceChunk]) -> None:
        top_links = [
            c.source_links[0] if c.source_links is not None else "No Link"
            for c in chunks
        ]
        logger.info(f"Top links from {search_flow} search: {', '.join(top_links)}")

    if query.search_type == SearchType.KEYWORD:
        top_chunks = document_index.keyword_retrieval(
            query.query, query.filters, query.favor_recent, query.num_hits
        )

    elif query.search_type == SearchType.SEMANTIC:
        top_chunks = document_index.semantic_retrieval(
            query.query, query.filters, query.favor_recent, query.num_hits
        )

    elif query.search_type == SearchType.HYBRID:
        top_chunks = document_index.hybrid_retrieval(
            query.query, query.filters, query.favor_recent, query.num_hits
        )

    else:
        raise RuntimeError("Invalid Search Flow")

    if not top_chunks:
        logger.info(
            f"{query.search_type.value.capitalize()} search returned no results "
            f"with filters: {query.filters}"
        )
        return None, None

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

    # Keyword Search should never do reranking, no transformers involved in this flow
    if query.search_type == SearchType.KEYWORD:
        _log_top_chunk_links(query.search_type.value, top_chunks)
        return top_chunks, None

    if query.skip_rerank:
        # Need the range of values to not be too spread out for applying boost
        # Therefore pass in smaller set of chunks to limit the range for norm-ing
        boosted_chunks = apply_boost(top_chunks[: query.num_rerank])
        _log_top_chunk_links(query.search_type.value, boosted_chunks)
        return boosted_chunks, top_chunks[query.num_rerank :]

    ranked_chunks = semantic_reranking(
        query.query,
        top_chunks[: query.num_rerank],
        rerank_metrics_callback=rerank_metrics_callback,
    )

    _log_top_chunk_links(query.search_type.value, ranked_chunks)

    return ranked_chunks, top_chunks[query.num_rerank :]


def danswer_search(
    question: QuestionRequest,
    user: User | None,
    db_session: Session,
    document_index: DocumentIndex,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk] | None, list[InferenceChunk] | None, int]:
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
        favor_recent=True if question.favor_recent is None else question.favor_recent,
    )

    ranked_chunks, unranked_chunks = search_chunks(
        query=search_query,
        document_index=document_index,
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )

    retrieved_ids = [doc.document_id for doc in ranked_chunks] if ranked_chunks else []

    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=retrieved_ids,
        query_id=query_event_id,
        user_id=None if user is None else user.id,
    )

    return ranked_chunks, unranked_chunks, query_event_id
