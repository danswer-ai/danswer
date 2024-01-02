from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.configs.chat_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.vespa.index import VespaIndex
from danswer.one_shot_answer.answer_question import stream_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.danswer_helper import recommend_search_flow
from danswer.search.models import IndexFilters
from danswer.search.models import SavedSearchDoc
from danswer.search.models import SearchDoc
from danswer.search.models import SearchQuery
from danswer.search.models import SearchResponse
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search
from danswer.secondary_llm_flows.query_validation import get_query_answerability
from danswer.secondary_llm_flows.query_validation import stream_query_answerability
from danswer.server.query_and_chat.models import AdminSearchRequest
from danswer.server.query_and_chat.models import AdminSearchResponse
from danswer.server.query_and_chat.models import DocumentSearchRequest
from danswer.server.query_and_chat.models import HelperResponse
from danswer.server.query_and_chat.models import QueryValidationResponse
from danswer.server.query_and_chat.models import SimpleQueryRequest
from danswer.utils.logger import setup_logger

logger = setup_logger()

admin_router = APIRouter(prefix="/admin")
basic_router = APIRouter(prefix="/query")


@admin_router.post("/search")
def admin_search(
    question: AdminSearchRequest,
    user: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> AdminSearchResponse:
    query = question.query
    logger.info(f"Received admin search query: {query}")

    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=question.filters.source_type,
        document_set=question.filters.document_set,
        time_cutoff=question.filters.time_cutoff,
        access_control_list=user_acl_filters,
    )
    document_index = get_default_document_index()
    if not isinstance(document_index, VespaIndex):
        raise HTTPException(
            status_code=400,
            detail="Cannot use admin-search when using a non-Vespa document index",
        )

    matching_chunks = document_index.admin_retrieval(query=query, filters=final_filters)

    documents = chunks_to_search_docs(matching_chunks)

    # Deduplicate documents by id
    deduplicated_documents: list[SearchDoc] = []
    seen_documents: set[str] = set()
    for document in documents:
        if document.document_id not in seen_documents:
            deduplicated_documents.append(document)
            seen_documents.add(document.document_id)
    return AdminSearchResponse(documents=deduplicated_documents)


@basic_router.post("/search-intent")
def get_search_type(
    simple_query: SimpleQueryRequest, _: User = Depends(current_user)
) -> HelperResponse:
    logger.info(f"Calculating intent for {simple_query.query}")
    return recommend_search_flow(simple_query.query)


@basic_router.post("/query-validation")
def query_validation(
    simple_query: SimpleQueryRequest, _: User = Depends(current_user)
) -> QueryValidationResponse:
    # Note if weak model prompt is chosen, this check does not occur and will simply return that
    # the query is valid, this is because weaker models cannot really handle this task well.
    # Additionally, some weak model servers cannot handle concurrent inferences.
    logger.info(f"Validating query: {simple_query.query}")
    reasoning, answerable = get_query_answerability(simple_query.query)
    return QueryValidationResponse(reasoning=reasoning, answerable=answerable)


@basic_router.post("/stream-query-validation")
def stream_query_validation(
    simple_query: SimpleQueryRequest, _: User = Depends(current_user)
) -> StreamingResponse:
    # Note if weak model prompt is chosen, this check does not occur and will simply return that
    # the query is valid, this is because weaker models cannot really handle this task well.
    # Additionally, some weak model servers cannot handle concurrent inferences.
    logger.info(f"Validating query: {simple_query.query}")
    return StreamingResponse(
        stream_query_answerability(simple_query.query), media_type="application/json"
    )


@basic_router.post("/document-search")
def handle_search_request(
    search_request: DocumentSearchRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
    # Default to running LLM filter unless globally disabled
    disable_llm_chunk_filter: bool = DISABLE_LLM_CHUNK_FILTER,
) -> SearchResponse:
    """Simple search endpoint, does not create a new message or records in the DB"""
    query = search_request.message
    filters = search_request.retrieval_options.filters

    logger.info(f"Received document search query: {query}")

    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=filters.source_type if filters else None,
        document_set=filters.document_set if filters else None,
        time_cutoff=filters.time_cutoff if filters else None,
        access_control_list=user_acl_filters,
    )

    search_query = SearchQuery(
        query=query,
        search_type=search_request.search_type,
        filters=final_filters,
        recency_bias_multiplier=search_request.recency_bias_multiplier,
        skip_rerank=search_request.skip_rerank,
        skip_llm_chunk_filter=disable_llm_chunk_filter,
    )

    top_chunks, llm_selection = full_chunk_search(
        query=search_query,
        document_index=get_default_document_index(),
    )

    top_docs = chunks_to_search_docs(top_chunks)
    llm_selection_indices = [
        index for index, value in enumerate(llm_selection) if value
    ]

    # No need to save the docs for this API
    fake_saved_docs = [SavedSearchDoc.from_search_doc(doc) for doc in top_docs]

    return SearchResponse(
        top_documents=fake_saved_docs, llm_indices=llm_selection_indices
    )


@basic_router.post("/stream-answer-with-quote")
def get_answer_with_quote(
    query_request: DirectQARequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    query = query_request.messages[0].message
    logger.info(f"Received query for one shot answer with quotes: {query}")
    packets = stream_search_answer(
        query_req=query_request, user=user, db_session=db_session
    )
    return StreamingResponse(packets, media_type="application/json")
