from sqlalchemy.orm import Session

from danswer.configs.app_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.app_configs import DISABLE_LLM_FILTER_EXTRACTION
from danswer.configs.model_configs import ENABLE_RERANKING_REAL_TIME_FLOW
from danswer.configs.model_configs import SKIP_RERANKING
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.danswer_helper import query_intent
from danswer.search.models import BaseFilters
from danswer.search.models import IndexFilters
from danswer.search.models import QueryFlow
from danswer.search.models import SearchQuery
from danswer.search.models import SearchType
from danswer.secondary_llm_flows.source_filter import extract_source_filter
from danswer.secondary_llm_flows.time_filter import extract_time_filter
from danswer.server.chat.models import RetrievalDetails
from danswer.utils.threadpool_concurrency import FunctionCall
from danswer.utils.threadpool_concurrency import run_functions_in_parallel


def retrieval_preprocessing(
    query: str,
    retrieval_details: RetrievalDetails,
    persona: Persona,
    user: User | None,
    db_session: Session,
    bypass_acl: bool = False,
    include_query_intent: bool = True,
    skip_rerank_realtime: bool = not ENABLE_RERANKING_REAL_TIME_FLOW,
    skip_rerank_non_realtime: bool = SKIP_RERANKING,
    disable_llm_filter_extraction: bool = DISABLE_LLM_FILTER_EXTRACTION,
    disable_llm_chunk_filter: bool = DISABLE_LLM_CHUNK_FILTER,
) -> tuple[SearchQuery, SearchType | None, QueryFlow | None]:
    # TODO this logic needs to be updated!!!

    preset_filters = (
        retrieval_details.filters
        if retrieval_details.filters is not None
        else BaseFilters()
    )

    auto_filters_enabled = (
        not disable_llm_filter_extraction
        and retrieval_details.enable_auto_detect_filters
    )

    # based on the query figure out if we should apply any hard time filters /
    # if we should bias more recent docs even more strongly
    run_time_filters = (
        FunctionCall(extract_time_filter, (query,), {})
        if auto_filters_enabled
        else None
    )

    # based on the query, figure out if we should apply any source filters
    should_run_source_filters = auto_filters_enabled and not preset_filters.source_type
    run_source_filters = (
        FunctionCall(extract_source_filter, (query, db_session), {})
        if should_run_source_filters
        else None
    )
    # NOTE: this isn't really part of building the retrieval request, but is done here
    # so it can be simply done in parallel with the filters without multi-level multithreading
    run_query_intent = (
        FunctionCall(query_intent, (query,), {}) if include_query_intent else None
    )

    functions_to_run = [
        filter_fn
        for filter_fn in [
            run_time_filters,
            run_source_filters,
            run_query_intent,
        ]
        if filter_fn
    ]
    parallel_results = run_functions_in_parallel(functions_to_run)

    time_cutoff, favor_recent = (
        parallel_results[run_time_filters.result_id]
        if run_time_filters
        else (None, None)
    )
    source_filters = (
        parallel_results[run_source_filters.result_id] if run_source_filters else None
    )
    predicted_search_type, predicted_flow = (
        parallel_results[run_query_intent.result_id]
        if run_query_intent
        else (None, None)
    )

    user_acl_filters = (
        None if bypass_acl else build_access_filters_for_user(user, db_session)
    )
    final_filters = IndexFilters(
        source_type=preset_filters.source_type or source_filters,
        document_set=preset_filters.document_set,
        time_cutoff=preset_filters.time_cutoff or time_cutoff,
        access_control_list=user_acl_filters,
    )

    # figure out if we should skip running Tranformer-based re-ranking of the
    # top chunks
    skip_reranking = (
        skip_rerank_realtime
        if retrieval_details.real_time
        else skip_rerank_non_realtime
    )

    return (
        SearchQuery(
            query=query,
            search_type=retrieval_details.search_type,
            filters=final_filters,
            # use user specified favor_recent over generated favor_recent
            favor_recent=(
                retrieval_details.favor_recent
                if retrieval_details.favor_recent is not None
                else (favor_recent or False)
            ),
            skip_rerank=skip_reranking,
            skip_llm_chunk_filter=skip_llm_chunk_filter,
        ),
        predicted_search_type,
        predicted_flow,
    )
