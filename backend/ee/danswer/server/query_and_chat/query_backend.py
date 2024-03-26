from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.configs.chat_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.danswerbot_configs import DANSWER_BOT_TARGET_CHUNK_PERCENTAGE
from danswer.db.chat import get_persona_by_id
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.llm.answering.prompts.citations_prompt import compute_max_document_tokens
from danswer.llm.utils import get_default_llm_version
from danswer.llm.utils import get_max_input_tokens
from danswer.one_shot_answer.answer_question import get_search_answer
from danswer.one_shot_answer.models import DirectQARequest
from danswer.one_shot_answer.models import OneShotQAResponse
from danswer.search.models import SavedSearchDoc
from danswer.search.models import SearchRequest
from danswer.search.models import SearchResponse
from danswer.search.pipeline import SearchPipeline
from danswer.search.utils import chunks_to_search_docs
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
    logger.info(f"Received document search query: {query}")

    search_pipeline = SearchPipeline(
        search_request=SearchRequest(
            query=query,
            search_type=search_request.search_type,
            human_selected_filters=search_request.retrieval_options.filters,
            enable_auto_detect_filters=search_request.retrieval_options.enable_auto_detect_filters,
            persona=None,  # For simplicity, default settings should be good for this search
            offset=search_request.retrieval_options.offset,
            limit=search_request.retrieval_options.limit,
        ),
        user=user,
        db_session=db_session,
        bypass_acl=False,
    )
    top_chunks = search_pipeline.reranked_docs
    relevant_chunk_indices = search_pipeline.relevant_chunk_indicies
    top_docs = chunks_to_search_docs(top_chunks)

    # No need to save the docs for this API
    fake_saved_docs = [SavedSearchDoc.from_search_doc(doc) for doc in top_docs]

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
