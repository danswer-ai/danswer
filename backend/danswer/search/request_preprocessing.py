from sqlalchemy.orm import Session

from danswer.configs.chat_configs import BASE_RECENCY_DECAY
from danswer.configs.chat_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.chat_configs import DISABLE_LLM_FILTER_EXTRACTION
from danswer.configs.chat_configs import FAVOR_RECENT_DECAY_MULTIPLIER
from danswer.configs.chat_configs import NUM_RETURNED_HITS
from danswer.configs.model_configs import ENABLE_RERANKING_ASYNC_FLOW
from danswer.configs.model_configs import ENABLE_RERANKING_REAL_TIME_FLOW
from danswer.db.models import Persona
from danswer.db.models import User
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.danswer_helper import query_intent
from danswer.search.models import BaseFilters
from danswer.search.models import IndexFilters
from danswer.search.models import QueryFlow
from danswer.search.models import RecencyBiasSetting
from danswer.search.models import RetrievalDetails
from danswer.search.models import SearchQuery
from danswer.search.models import SearchType
from danswer.secondary_llm_flows.source_filter import extract_source_filter
from danswer.secondary_llm_flows.time_filter import extract_time_filter
from danswer.utils.logger import setup_logger
from danswer.utils.threadpool_concurrency import FunctionCall
from danswer.utils.threadpool_concurrency import run_functions_in_parallel
from danswer.utils.timing import log_function_time


logger = setup_logger()


@log_function_time(print_only=True)
def retrieval_preprocessing(
    query: str,
    retrieval_details: RetrievalDetails,
    persona: Persona,
    user: User | None,
    db_session: Session,
    bypass_acl: bool = False,
    include_query_intent: bool = True,
    skip_rerank_realtime: bool = not ENABLE_RERANKING_REAL_TIME_FLOW,
    skip_rerank_non_realtime: bool = not ENABLE_RERANKING_ASYNC_FLOW,
    disable_llm_filter_extraction: bool = DISABLE_LLM_FILTER_EXTRACTION,
    disable_llm_chunk_filter: bool = DISABLE_LLM_CHUNK_FILTER,
    base_recency_decay: float = BASE_RECENCY_DECAY,
    favor_recent_decay_multiplier: float = FAVOR_RECENT_DECAY_MULTIPLIER,
) -> tuple[SearchQuery, SearchType | None, QueryFlow | None]:
    """Logic is as follows:
    Any global disables apply first
    Then any filters or settings as part of the query are used
    Then defaults to Persona settings if not specified by the query
    """

    preset_filters = retrieval_details.filters or BaseFilters()
    if persona and persona.document_sets and preset_filters.document_set is None:
        preset_filters.document_set = [
            document_set.name for document_set in persona.document_sets
        ]

    time_filter = preset_filters.time_cutoff
    source_filter = preset_filters.source_type

    auto_detect_time_filter = True
    auto_detect_source_filter = True
    if disable_llm_filter_extraction:
        auto_detect_time_filter = False
        auto_detect_source_filter = False
    elif retrieval_details.enable_auto_detect_filters is False:
        logger.debug("Retrieval details disables auto detect filters")
        auto_detect_time_filter = False
        auto_detect_source_filter = False
    elif persona.llm_filter_extraction is False:
        logger.debug("Persona disables auto detect filters")
        auto_detect_time_filter = False
        auto_detect_source_filter = False

    if time_filter is not None and persona.recency_bias != RecencyBiasSetting.AUTO:
        auto_detect_time_filter = False
        logger.debug("Not extract time filter - already provided")
    if source_filter is not None:
        logger.debug("Not extract source filter - already provided")
        auto_detect_source_filter = False

    # Based on the query figure out if we should apply any hard time filters /
    # if we should bias more recent docs even more strongly
    run_time_filters = (
        FunctionCall(extract_time_filter, (query,), {})
        if auto_detect_time_filter
        else None
    )

    # Based on the query, figure out if we should apply any source filters
    run_source_filters = (
        FunctionCall(extract_source_filter, (query, db_session), {})
        if auto_detect_source_filter
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

    predicted_time_cutoff, predicted_favor_recent = (
        parallel_results[run_time_filters.result_id]
        if run_time_filters
        else (None, None)
    )
    predicted_source_filters = (
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
        source_type=preset_filters.source_type or predicted_source_filters,
        document_set=preset_filters.document_set,
        time_cutoff=preset_filters.time_cutoff or predicted_time_cutoff,
        tags=preset_filters.tags,  # Tags are never auto-extracted
        access_control_list=user_acl_filters,
    )

    # Tranformer-based re-ranking to run at same time as LLM chunk relevance filter
    # This one is only set globally, not via query or Persona settings
    skip_reranking = (
        skip_rerank_realtime
        if retrieval_details.real_time
        else skip_rerank_non_realtime
    )

    llm_chunk_filter = persona.llm_relevance_filter
    if disable_llm_chunk_filter:
        llm_chunk_filter = False

    # Decays at 1 / (1 + (multiplier * num years))
    if persona.recency_bias == RecencyBiasSetting.NO_DECAY:
        recency_bias_multiplier = 0.0
    elif persona.recency_bias == RecencyBiasSetting.BASE_DECAY:
        recency_bias_multiplier = base_recency_decay
    elif persona.recency_bias == RecencyBiasSetting.FAVOR_RECENT:
        recency_bias_multiplier = base_recency_decay * favor_recent_decay_multiplier
    else:
        if predicted_favor_recent:
            recency_bias_multiplier = base_recency_decay * favor_recent_decay_multiplier
        else:
            recency_bias_multiplier = base_recency_decay

    return (
        SearchQuery(
            query=query,
            search_type=persona.search_type,
            filters=final_filters,
            recency_bias_multiplier=recency_bias_multiplier,
            num_hits=retrieval_details.limit
            if retrieval_details.limit is not None
            else NUM_RETURNED_HITS,
            offset=retrieval_details.offset or 0,
            skip_rerank=skip_reranking,
            skip_llm_chunk_filter=not llm_chunk_filter,
        ),
        predicted_search_type,
        predicted_flow,
    )
