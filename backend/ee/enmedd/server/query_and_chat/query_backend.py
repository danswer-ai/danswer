from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ee.enmedd.server.query_and_chat.models import DocumentSearchRequest
from ee.enmedd.server.query_and_chat.utils import create_temporary_assistant
from enmedd.auth.users import current_user
from enmedd.db.assistant import get_assistant_by_id
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.llm.answering.prompts.citations_prompt import (
    compute_max_document_tokens_for_assistant,
)
from enmedd.llm.factory import get_default_llms
from enmedd.llm.factory import get_llms_for_assistant
from enmedd.llm.factory import get_main_llm_from_tuple
from enmedd.llm.utils import get_max_input_tokens
from enmedd.one_shot_answer.answer_question import get_search_answer
from enmedd.one_shot_answer.models import DirectQARequest
from enmedd.one_shot_answer.models import OneShotQAResponse
from enmedd.search.models import SavedSearchDocWithContent
from enmedd.search.models import SearchRequest
from enmedd.search.pipeline import SearchPipeline
from enmedd.search.utils import dedupe_documents
from enmedd.search.utils import drop_llm_indices
from enmedd.search.utils import relevant_sections_to_indices
from enmedd.utils.logger import setup_logger


logger = setup_logger()
basic_router = APIRouter(prefix="/query")


class DocumentSearchResponse(BaseModel):
    top_documents: list[SavedSearchDocWithContent]
    llm_indices: list[int]


@basic_router.post("/document-search")
def handle_search_request(
    search_request: DocumentSearchRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> DocumentSearchResponse:
    """Simple search endpoint, does not create a new message or records in the DB"""
    query = search_request.message
    logger.notice(f"Received document search query: {query}")

    llm, fast_llm = get_default_llms()

    search_pipeline = SearchPipeline(
        search_request=SearchRequest(
            query=query,
            search_type=search_request.search_type,
            human_selected_filters=search_request.retrieval_options.filters,
            enable_auto_detect_filters=search_request.retrieval_options.enable_auto_detect_filters,
            assistant=None,  # For simplicity, default settings should be good for this search
            offset=search_request.retrieval_options.offset,
            limit=search_request.retrieval_options.limit,
            rerank_settings=search_request.rerank_settings,
            evaluation_type=search_request.evaluation_type,
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
    relevance_sections = search_pipeline.section_relevance
    top_docs = [
        SavedSearchDocWithContent(
            document_id=section.center_chunk.document_id,
            chunk_ind=section.center_chunk.chunk_id,
            content=section.center_chunk.content,
            semantic_identifier=section.center_chunk.semantic_identifier or "Unknown",
            link=section.center_chunk.source_links.get(0)
            if section.center_chunk.source_links
            else None,
            blurb=section.center_chunk.blurb,
            source_type=section.center_chunk.source_type,
            boost=section.center_chunk.boost,
            hidden=section.center_chunk.hidden,
            metadata=section.center_chunk.metadata,
            score=section.center_chunk.score or 0.0,
            match_highlights=section.center_chunk.match_highlights,
            updated_at=section.center_chunk.updated_at,
            primary_owners=section.center_chunk.primary_owners,
            secondary_owners=section.center_chunk.secondary_owners,
            is_internet=False,
            db_doc_id=0,
        )
        for section in top_sections
    ]

    # Deduping happens at the last step to avoid harming quality by dropping content early on
    deduped_docs = top_docs
    dropped_inds = None

    if search_request.retrieval_options.dedupe_docs:
        deduped_docs, dropped_inds = dedupe_documents(top_docs)

    llm_indices = relevant_sections_to_indices(
        relevance_sections=relevance_sections, items=deduped_docs
    )

    if dropped_inds:
        llm_indices = drop_llm_indices(
            llm_indices=llm_indices,
            search_docs=deduped_docs,
            dropped_indices=dropped_inds,
        )

    return DocumentSearchResponse(top_documents=deduped_docs, llm_indices=llm_indices)


@basic_router.post("/answer-with-quote")
def get_answer_with_quote(
    query_request: DirectQARequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> OneShotQAResponse:
    query = query_request.messages[0].message
    logger.notice(f"Received query for one shot answer API with quotes: {query}")

    if query_request.assistant_config is not None:
        new_assistant = create_temporary_assistant(
            db_session=db_session,
            assistant_config=query_request.assistant_config,
            user=user,
        )
        assistant = new_assistant

    elif query_request.assistant_id is not None:
        assistant = get_assistant_by_id(
            assistant_id=query_request.assistant_id,
            user=user,
            db_session=db_session,
            is_for_edit=False,
        )
    else:
        raise KeyError("Must provide assistant ID or Assistant Config")

    llm = get_main_llm_from_tuple(
        get_default_llms() if not assistant else get_llms_for_assistant(assistant)
    )
    input_tokens = get_max_input_tokens(
        model_name=llm.config.model_name, model_provider=llm.config.model_provider
    )
    max_history_tokens = int(input_tokens)

    remaining_tokens = input_tokens - max_history_tokens

    max_document_tokens = compute_max_document_tokens_for_assistant(
        assistant=assistant,
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
