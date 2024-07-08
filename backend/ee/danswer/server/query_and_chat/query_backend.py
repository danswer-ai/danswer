from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.configs.danswerbot_configs import DANSWER_BOT_TARGET_CHUNK_PERCENTAGE
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.db.persona import get_persona_by_id
from danswer.llm.answering.prompts.citations_prompt import (
    compute_max_document_tokens_for_persona,
)
from danswer.llm.factory import get_default_llms
from danswer.llm.factory import get_llms_for_persona
from danswer.llm.factory import get_main_llm_from_tuple
from danswer.llm.utils import get_max_input_tokens
from danswer.one_shot_answer.answer_question import get_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.search.models import SavedSearchDoc
from danswer.search.models import SearchRequest
from danswer.search.models import SearchResponse
from danswer.search.pipeline import SearchPipeline
from danswer.search.utils import chunks_or_sections_to_search_docs
from danswer.search.utils import dedupe_documents
from danswer.search.utils import drop_llm_indices
from danswer.utils.logger import setup_logger
from ee.danswer.server.query_and_chat.models import DocumentSearchRequest


logger = setup_logger()
basic_router = APIRouter(prefix="/query")


@basic_router.post("/document-search")
def handle_search_request(
    search_request: DocumentSearchRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    """Simple search endpoint, does not create a new message or records in the DB"""
    query = search_request.message
    logger.info(f"Received document search query: {query}")

    llm, fast_llm = get_default_llms()
    search_pipeline = SearchPipeline(
        search_request=SearchRequest(
            query=query,
            search_type=search_request.search_type,
            human_selected_filters=search_request.retrieval_options.filters,
            enable_auto_detect_filters=search_request.retrieval_options.enable_auto_detect_filters,
            persona=None,  # For simplicity, default settings should be good for this search
            offset=search_request.retrieval_options.offset,
            limit=search_request.retrieval_options.limit,
            skip_rerank=search_request.skip_rerank,
            skip_llm_chunk_filter=search_request.skip_llm_chunk_filter,
            chunks_above=search_request.chunks_above,
            chunks_below=search_request.chunks_below,
            full_doc=search_request.full_doc,
        ),
        user=user,
        llm=llm,
        fast_llm=fast_llm,
        db_session=db_session,
        bypass_acl=False,
    )
    top_sections = search_pipeline.reranked_sections
    # If using surrounding context or full doc, this will be empty
    relevant_chunk_indices = search_pipeline.relevant_chunk_indices
    top_docs = chunks_or_sections_to_search_docs(top_sections)

    # Deduping happens at the last step to avoid harming quality by dropping content early on
    deduped_docs = top_docs
    dropped_inds = None
    if search_request.retrieval_options.dedupe_docs:
        deduped_docs, dropped_inds = dedupe_documents(top_docs)

    # No need to save the docs for this API
    fake_saved_docs = [SavedSearchDoc.from_search_doc(doc) for doc in deduped_docs]

    if dropped_inds:
        relevant_chunk_indices = drop_llm_indices(
            llm_indices=relevant_chunk_indices,
            search_docs=fake_saved_docs,
            dropped_indices=dropped_inds,
        )

    return SearchResponse(
        top_documents=fake_saved_docs, llm_indices=relevant_chunk_indices
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
        user=user,
        db_session=db_session,
        is_for_edit=False,
    )

    llm = get_main_llm_from_tuple(
        get_default_llms() if not persona else get_llms_for_persona(persona)
    )
    input_tokens = get_max_input_tokens(
        model_name=llm.config.model_name, model_provider=llm.config.model_provider
    )
    max_history_tokens = int(input_tokens * DANSWER_BOT_TARGET_CHUNK_PERCENTAGE)

    remaining_tokens = input_tokens - max_history_tokens

    max_document_tokens = compute_max_document_tokens_for_persona(
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
