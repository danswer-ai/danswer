from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.chat.chat_utils import compute_max_document_tokens
from danswer.configs.chat_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.chat_configs import NUM_RETURNED_HITS
from danswer.configs.danswerbot_configs import DANSWER_BOT_TARGET_CHUNK_PERCENTAGE
from danswer.db.chat import get_persona_by_id
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.llm.utils import get_default_llm_version
from danswer.llm.utils import get_max_input_tokens
from danswer.one_shot_answer.answer_question import get_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.models import IndexFilters
from danswer.search.models import SavedSearchDoc
from danswer.search.models import SearchQuery
from danswer.search.models import SearchResponse
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search
from danswer.server.query_and_chat.models import DocumentSearchRequest
from danswer.utils.logger import setup_logger


logger = setup_logger()
basic_router = APIRouter(prefix="/query")


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
        tags=filters.tags if filters else None,
        access_control_list=user_acl_filters,
    )

    limit = (
        search_request.retrieval_options.limit
        if search_request.retrieval_options.limit is not None
        else NUM_RETURNED_HITS
    )
    offset = (
        search_request.retrieval_options.offset
        if search_request.retrieval_options.offset is not None
        else 0
    )
    search_query = SearchQuery(
        query=query,
        search_type=search_request.search_type,
        filters=final_filters,
        recency_bias_multiplier=search_request.recency_bias_multiplier,
        num_hits=limit,
        offset=offset,
        skip_rerank=search_request.skip_rerank,
        skip_llm_chunk_filter=disable_llm_chunk_filter,
    )

    db_embedding_model = get_current_db_embedding_model(db_session)
    document_index = get_default_document_index(
        primary_index_name=db_embedding_model.index_name, secondary_index_name=None
    )

    top_chunks, llm_selection = full_chunk_search(
        query=search_query, document_index=document_index, db_session=db_session
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


@basic_router.post("/answer-with-quote")
def get_answer_with_quote(
    query_request: DirectQARequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> OneShotQAResponse:
    query = query_request.messages[0].message
    logger.info(f"Received query for one shot answer API with quotes: {query}")

    persona = get_persona_by_id(
        persona_id=query_request.persona_id,
        user_id=user.id if user else None,
        db_session=db_session,
    )

    llm_name = get_default_llm_version()[0]
    if persona and persona.llm_model_version_override:
        llm_name = persona.llm_model_version_override

    input_tokens = get_max_input_tokens(model_name=llm_name)
    max_history_tokens = int(input_tokens * DANSWER_BOT_TARGET_CHUNK_PERCENTAGE)

    remaining_tokens = input_tokens - max_history_tokens

    max_document_tokens = compute_max_document_tokens(
        persona=persona,
        actual_user_input=query,
        max_llm_token_override=remaining_tokens,
    )

    answer_details = get_search_answer(
        query_req=query_request,
        user=user,
        max_document_tokens=max_document_tokens,
        max_history_tokens=max_history_tokens,
        db_session=db_session,
    )

    return answer_details
