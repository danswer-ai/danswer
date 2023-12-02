from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.db.engine import get_session
from danswer.db.feedback import create_doc_retrieval_feedback
from danswer.db.feedback import create_query_event
from danswer.db.feedback import update_query_event_feedback
from danswer.db.models import User
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.direct_qa.answer_question import answer_qa_query_stream
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.vespa.index import VespaIndex
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.danswer_helper import recommend_search_flow
from danswer.search.models import IndexFilters
from danswer.search.request_preprocessing import retrieval_preprocessing
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search
from danswer.secondary_llm_flows.query_validation import get_query_answerability
from danswer.secondary_llm_flows.query_validation import stream_query_answerability
from danswer.server.models import AdminSearchRequest
from danswer.server.models import AdminSearchResponse
from danswer.server.models import HelperResponse
from danswer.server.models import NewMessageRequest
from danswer.server.models import QAFeedbackRequest
from danswer.server.models import QAResponse
from danswer.server.models import QueryValidationResponse
from danswer.server.models import SearchDoc
from danswer.server.models import SearchFeedbackRequest
from danswer.server.models import SearchResponse
from danswer.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter()


"""Admin-only search endpoints"""


@router.post("/admin/search")
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

    # deduplicate documents by id
    deduplicated_documents: list[SearchDoc] = []
    seen_documents: set[str] = set()
    for document in documents:
        if document.document_id not in seen_documents:
            deduplicated_documents.append(document)
            seen_documents.add(document.document_id)
    return AdminSearchResponse(documents=deduplicated_documents)


"""Search endpoints for all"""


@router.post("/search-intent")
def get_search_type(
    new_message_request: NewMessageRequest, _: User = Depends(current_user)
) -> HelperResponse:
    query = new_message_request.query
    return recommend_search_flow(query)


@router.post("/query-validation")
def query_validation(
    new_message_request: NewMessageRequest, _: User = Depends(current_user)
) -> QueryValidationResponse:
    query = new_message_request.query
    reasoning, answerable = get_query_answerability(query)
    return QueryValidationResponse(reasoning=reasoning, answerable=answerable)


@router.post("/stream-query-validation")
def stream_query_validation(
    new_message_request: NewMessageRequest, _: User = Depends(current_user)
) -> StreamingResponse:
    query = new_message_request.query
    return StreamingResponse(
        stream_query_answerability(query), media_type="application/json"
    )


@router.post("/document-search")
def handle_search_request(
    new_message_request: NewMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    query = new_message_request.query
    logger.info(
        f"Received {new_message_request.search_type.value} " f"search query: {query}"
    )

    # create record for this query in Postgres
    query_event_id = create_query_event(
        query=new_message_request.query,
        chat_session_id=new_message_request.chat_session_id,
        search_type=new_message_request.search_type,
        llm_answer=None,
        user_id=user.id if user is not None else None,
        db_session=db_session,
    )

    retrieval_request, _, _ = retrieval_preprocessing(
        new_message_request=new_message_request,
        user=user,
        db_session=db_session,
        include_query_intent=False,
    )

    top_chunks, _ = full_chunk_search(
        query=retrieval_request,
        document_index=get_default_document_index(),
    )
    top_docs = chunks_to_search_docs(top_chunks)

    return SearchResponse(
        top_documents=top_docs,
        query_event_id=query_event_id,
        source_type=retrieval_request.filters.source_type,
        time_cutoff=retrieval_request.filters.time_cutoff,
        favor_recent=retrieval_request.favor_recent,
    )


@router.post("/direct-qa")
def direct_qa(
    new_message_request: NewMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> QAResponse:
    # Everything handled via answer_qa_query which is also used by default
    # for the DanswerBot flow
    return answer_qa_query(
        new_message_request=new_message_request, user=user, db_session=db_session
    )


@router.post("/stream-direct-qa")
def stream_direct_qa(
    new_message_request: NewMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    packets = answer_qa_query_stream(
        new_message_request=new_message_request, user=user, db_session=db_session
    )
    return StreamingResponse(packets, media_type="application/json")


@router.post("/query-feedback")
def process_query_feedback(
    feedback: QAFeedbackRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    update_query_event_feedback(
        feedback=feedback.feedback,
        query_id=feedback.query_id,
        user_id=user.id if user is not None else None,
        db_session=db_session,
    )


@router.post("/doc-retrieval-feedback")
def process_doc_retrieval_feedback(
    feedback: SearchFeedbackRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    create_doc_retrieval_feedback(
        qa_event_id=feedback.query_id,
        document_id=feedback.document_id,
        document_rank=feedback.document_rank,
        clicked=feedback.click,
        feedback=feedback.search_feedback,
        user_id=user.id if user is not None else None,
        document_index=get_default_document_index(),
        db_session=db_session,
    )
