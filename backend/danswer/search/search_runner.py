import string
from collections.abc import Callable
from collections.abc import Iterator
from typing import cast

import numpy
from nltk.corpus import stopwords  # type:ignore
from nltk.stem import WordNetLemmatizer  # type:ignore
from nltk.tokenize import word_tokenize  # type:ignore
from sqlalchemy.orm import Session

from danswer.chat.models import LlmDoc
from danswer.configs.app_configs import MODEL_SERVER_HOST
from danswer.configs.app_configs import MODEL_SERVER_PORT
from danswer.configs.chat_configs import HYBRID_ALPHA
from danswer.configs.chat_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.configs.chat_configs import NUM_RERANKED_RESULTS
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MAX
from danswer.configs.model_configs import CROSS_ENCODER_RANGE_MIN
from danswer.configs.model_configs import SIM_SCORE_RANGE_HIGH
from danswer.configs.model_configs import SIM_SCORE_RANGE_LOW
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.document_index.document_index_utils import (
    translate_boost_count_to_multiplier,
)
from danswer.document_index.interfaces import DocumentIndex
from danswer.indexing.models import InferenceChunk
from danswer.search.models import ChunkMetric
from danswer.search.models import IndexFilters
from danswer.search.models import MAX_METRICS_CONTENT
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.models import SearchDoc
from danswer.search.models import SearchQuery
from danswer.search.models import SearchType
from danswer.search.search_nlp_models import CrossEncoderEnsembleModel
from danswer.search.search_nlp_models import EmbeddingModel
from danswer.search.search_nlp_models import EmbedTextType
from danswer.secondary_llm_flows.chunk_usefulness import llm_batch_eval_chunks
from danswer.secondary_llm_flows.query_expansion import multilingual_query_expansion
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import FunctionCall
from danswer.utils.threadpool_concurrency import run_functions_in_parallel
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel
from danswer.utils.timing import log_function_time


logger = setup_logger()


def _log_top_chunk_links(search_flow: str, chunks: list[InferenceChunk]) -> None:
    top_links = [
        c.source_links[0] if c.source_links is not None else "No Link" for c in chunks
    ]
    logger.info(f"Top links from {search_flow} search: {', '.join(top_links)}")


def lemmatize_text(text: str) -> list[str]:
    lemmatizer = WordNetLemmatizer()
    word_tokens = word_tokenize(text)
    return [lemmatizer.lemmatize(word) for word in word_tokens]


def remove_stop_words_and_punctuation(text: str) -> list[str]:
    stop_words = set(stopwords.words("english"))
    word_tokens = word_tokenize(text)
    text_trimmed = [
        word
        for word in word_tokens
        if (word.casefold() not in stop_words and word not in string.punctuation)
    ]
    return text_trimmed or word_tokens


def query_processing(
    query: str,
) -> str:
    query = " ".join(remove_stop_words_and_punctuation(query))
    query = " ".join(lemmatize_text(query))
    return query


def chunks_to_search_docs(chunks: list[InferenceChunk] | None) -> list[SearchDoc]:
    search_docs = (
        [
            SearchDoc(
                document_id=chunk.document_id,
                chunk_ind=chunk.chunk_id,
                semantic_identifier=chunk.semantic_identifier or "Unknown",
                link=chunk.source_links.get(0) if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
                boost=chunk.boost,
                hidden=chunk.hidden,
                metadata=chunk.metadata,
                score=chunk.score,
                match_highlights=chunk.match_highlights,
                updated_at=chunk.updated_at,
                primary_owners=chunk.primary_owners,
                secondary_owners=chunk.secondary_owners,
            )
            for chunk in chunks
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


@log_function_time(print_only=True)
def doc_index_retrieval(
    query: SearchQuery,
    document_index: DocumentIndex,
    db_session: Session,
    hybrid_alpha: float = HYBRID_ALPHA,
) -> list[InferenceChunk]:
    if query.search_type == SearchType.KEYWORD:
        top_chunks = document_index.keyword_retrieval(
            query=query.query,
            filters=query.filters,
            time_decay_multiplier=query.recency_bias_multiplier,
            num_to_retrieve=query.num_hits,
        )
    else:
        db_embedding_model = get_current_db_embedding_model(db_session)

        model = EmbeddingModel(
            model_name=db_embedding_model.model_name,
            query_prefix=db_embedding_model.query_prefix,
            passage_prefix=db_embedding_model.passage_prefix,
            normalize=db_embedding_model.normalize,
            # The below are globally set, this flow always uses the indexing one
            server_host=MODEL_SERVER_HOST,
            server_port=MODEL_SERVER_PORT,
        )

        query_embedding = model.encode([query.query], text_type=EmbedTextType.QUERY)[0]

        if query.search_type == SearchType.SEMANTIC:
            top_chunks = document_index.semantic_retrieval(
                query=query.query,
                query_embedding=query_embedding,
                filters=query.filters,
                time_decay_multiplier=query.recency_bias_multiplier,
                num_to_retrieve=query.num_hits,
            )

        elif query.search_type == SearchType.HYBRID:
            top_chunks = document_index.hybrid_retrieval(
                query=query.query,
                query_embedding=query_embedding,
                filters=query.filters,
                time_decay_multiplier=query.recency_bias_multiplier,
                num_to_retrieve=query.num_hits,
                offset=query.offset,
                hybrid_alpha=hybrid_alpha,
            )

        else:
            raise RuntimeError("Invalid Search Flow")

    return top_chunks


@log_function_time(print_only=True)
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


def _simplify_text(text: str) -> str:
    return "".join(
        char for char in text if char not in string.punctuation and not char.isspace()
    ).lower()


def retrieve_chunks(
    query: SearchQuery,
    document_index: DocumentIndex,
    db_session: Session,
    hybrid_alpha: float = HYBRID_ALPHA,  # Only applicable to hybrid search
    multilingual_expansion_str: str | None = MULTILINGUAL_QUERY_EXPANSION,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
) -> list[InferenceChunk]:
    """Returns a list of the best chunks from an initial keyword/semantic/ hybrid search."""
    # Don't do query expansion on complex queries, rephrasings likely would not work well
    if not multilingual_expansion_str or "\n" in query.query or "\r" in query.query:
        top_chunks = doc_index_retrieval(
            query=query,
            document_index=document_index,
            db_session=db_session,
            hybrid_alpha=hybrid_alpha,
        )
    else:
        simplified_queries = set()
        run_queries: list[tuple[Callable, tuple]] = []

        # Currently only uses query expansion on multilingual use cases
        query_rephrases = multilingual_query_expansion(
            query.query, multilingual_expansion_str
        )
        # Just to be extra sure, add the original query.
        query_rephrases.append(query.query)
        for rephrase in set(query_rephrases):
            # Sometimes the model rephrases the query in the same language with minor changes
            # Avoid doing an extra search with the minor changes as this biases the results
            simplified_rephrase = _simplify_text(rephrase)
            if simplified_rephrase in simplified_queries:
                continue
            simplified_queries.add(simplified_rephrase)

            q_copy = query.copy(update={"query": rephrase}, deep=True)
            run_queries.append(
                (
                    doc_index_retrieval,
                    (q_copy, document_index, db_session, hybrid_alpha),
                )
            )
        parallel_search_results = run_functions_tuples_in_parallel(run_queries)
        top_chunks = combine_retrieval_results(parallel_search_results)

    if not top_chunks:
        logger.info(
            f"{query.search_type.value.capitalize()} search returned no results "
            f"with filters: {query.filters}"
        )
        return []

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
            RetrievalMetricsContainer(
                search_type=query.search_type, metrics=chunk_metrics
            )
        )

    return top_chunks


def should_rerank(query: SearchQuery) -> bool:
    # Don't re-rank for keyword search
    return query.search_type != SearchType.KEYWORD and not query.skip_rerank


def should_apply_llm_based_relevance_filter(query: SearchQuery) -> bool:
    return not query.skip_llm_chunk_filter


def rerank_chunks(
    query: SearchQuery,
    chunks_to_rerank: list[InferenceChunk],
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> list[InferenceChunk]:
    ranked_chunks, _ = semantic_reranking(
        query=query.query,
        chunks=chunks_to_rerank[: query.num_rerank],
        rerank_metrics_callback=rerank_metrics_callback,
    )
    lower_chunks = chunks_to_rerank[query.num_rerank :]
    # Scores from rerank cannot be meaningfully combined with scores without rerank
    for lower_chunk in lower_chunks:
        lower_chunk.score = None
    ranked_chunks.extend(lower_chunks)
    return ranked_chunks


@log_function_time(print_only=True)
def filter_chunks(
    query: SearchQuery,
    chunks_to_filter: list[InferenceChunk],
) -> list[str]:
    """Filters chunks based on whether the LLM thought they were relevant to the query.

    Returns a list of the unique chunk IDs that were marked as relevant"""
    chunks_to_filter = chunks_to_filter[: query.max_llm_filter_chunks]
    llm_chunk_selection = llm_batch_eval_chunks(
        query=query.query,
        chunk_contents=[chunk.content for chunk in chunks_to_filter],
    )
    return [
        chunk.unique_id
        for ind, chunk in enumerate(chunks_to_filter)
        if llm_chunk_selection[ind]
    ]


def full_chunk_search(
    query: SearchQuery,
    document_index: DocumentIndex,
    db_session: Session,
    hybrid_alpha: float = HYBRID_ALPHA,  # Only applicable to hybrid search
    multilingual_expansion_str: str | None = MULTILINGUAL_QUERY_EXPANSION,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> tuple[list[InferenceChunk], list[bool]]:
    """A utility which provides an easier interface than `full_chunk_search_generator`.
    Rather than returning the chunks and llm relevance filter results in two separate
    yields, just returns them both at once."""
    search_generator = full_chunk_search_generator(
        search_query=query,
        document_index=document_index,
        db_session=db_session,
        hybrid_alpha=hybrid_alpha,
        multilingual_expansion_str=multilingual_expansion_str,
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )
    top_chunks = cast(list[InferenceChunk], next(search_generator))
    llm_chunk_selection = cast(list[bool], next(search_generator))
    return top_chunks, llm_chunk_selection


def empty_search_generator() -> Iterator[list[InferenceChunk] | list[bool]]:
    yield cast(list[InferenceChunk], [])
    yield cast(list[bool], [])


def full_chunk_search_generator(
    search_query: SearchQuery,
    document_index: DocumentIndex,
    db_session: Session,
    hybrid_alpha: float = HYBRID_ALPHA,  # Only applicable to hybrid search
    multilingual_expansion_str: str | None = MULTILINGUAL_QUERY_EXPANSION,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
) -> Iterator[list[InferenceChunk] | list[bool]]:
    """Always yields twice. Once with the selected chunks and once with the LLM relevance filter result.
    If LLM filter results are turned off, returns a list of False
    """
    chunks_yielded = False

    retrieved_chunks = retrieve_chunks(
        query=search_query,
        document_index=document_index,
        db_session=db_session,
        hybrid_alpha=hybrid_alpha,
        multilingual_expansion_str=multilingual_expansion_str,
        retrieval_metrics_callback=retrieval_metrics_callback,
    )

    if not retrieved_chunks:
        yield cast(list[InferenceChunk], [])
        yield cast(list[bool], [])
        return

    post_processing_tasks: list[FunctionCall] = []

    rerank_task_id = None
    if should_rerank(search_query):
        post_processing_tasks.append(
            FunctionCall(
                rerank_chunks,
                (
                    search_query,
                    retrieved_chunks,
                    rerank_metrics_callback,
                ),
            )
        )
        rerank_task_id = post_processing_tasks[-1].result_id
    else:
        final_chunks = retrieved_chunks
        # NOTE: if we don't rerank, we can return the chunks immediately
        # since we know this is the final order
        _log_top_chunk_links(search_query.search_type.value, final_chunks)
        yield final_chunks
        chunks_yielded = True

    llm_filter_task_id = None
    if should_apply_llm_based_relevance_filter(search_query):
        post_processing_tasks.append(
            FunctionCall(
                filter_chunks,
                (search_query, retrieved_chunks[: search_query.max_llm_filter_chunks]),
            )
        )
        llm_filter_task_id = post_processing_tasks[-1].result_id

    post_processing_results = (
        run_functions_in_parallel(post_processing_tasks)
        if post_processing_tasks
        else {}
    )
    reranked_chunks = cast(
        list[InferenceChunk] | None,
        post_processing_results.get(str(rerank_task_id)) if rerank_task_id else None,
    )
    if reranked_chunks:
        if chunks_yielded:
            logger.error(
                "Trying to yield re-ranked chunks, but chunks were already yielded. This should never happen."
            )
        else:
            _log_top_chunk_links(search_query.search_type.value, reranked_chunks)
            yield reranked_chunks

    llm_chunk_selection = cast(
        list[str] | None,
        post_processing_results.get(str(llm_filter_task_id))
        if llm_filter_task_id
        else None,
    )
    if llm_chunk_selection is not None:
        yield [
            chunk.unique_id in llm_chunk_selection
            for chunk in reranked_chunks or retrieved_chunks
        ]
    else:
        yield [False for _ in reranked_chunks or retrieved_chunks]


def combine_inference_chunks(inf_chunks: list[InferenceChunk]) -> LlmDoc:
    if not inf_chunks:
        raise ValueError("Cannot combine empty list of chunks")

    # Use the first link of the document
    first_chunk = inf_chunks[0]
    chunk_texts = [chunk.content for chunk in inf_chunks]
    return LlmDoc(
        document_id=first_chunk.document_id,
        content="\n".join(chunk_texts),
        semantic_identifier=first_chunk.semantic_identifier,
        source_type=first_chunk.source_type,
        metadata=first_chunk.metadata,
        updated_at=first_chunk.updated_at,
        link=first_chunk.source_links[0] if first_chunk.source_links else None,
    )


def inference_documents_from_ids(
    doc_identifiers: list[tuple[str, int]],
    document_index: DocumentIndex,
) -> list[LlmDoc]:
    # Currently only fetches whole docs
    doc_ids_set = set(doc_id for doc_id, chunk_id in doc_identifiers)

    # No need for ACL here because the doc ids were validated beforehand
    filters = IndexFilters(access_control_list=None)

    functions_with_args: list[tuple[Callable, tuple]] = [
        (document_index.id_based_retrieval, (doc_id, None, filters))
        for doc_id in doc_ids_set
    ]

    parallel_results = run_functions_tuples_in_parallel(
        functions_with_args, allow_failures=True
    )

    # Any failures to retrieve would give a None, drop the Nones and empty lists
    inference_chunks_sets = [res for res in parallel_results if res]

    return [combine_inference_chunks(chunk_set) for chunk_set in inference_chunks_sets]
