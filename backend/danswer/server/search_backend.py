from collections.abc import Generator

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.db.engine import get_session
from danswer.db.feedback import create_doc_retrieval_feedback
from danswer.db.feedback import create_query_event
from danswer.db.feedback import update_query_event_feedback
from danswer.db.feedback import update_query_event_retrieved_documents
from danswer.db.models import User
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import StreamingError
from danswer.direct_qa.llm_utils import get_default_qa_model
from danswer.direct_qa.qa_utils import get_usable_chunks
from danswer.document_index import get_default_document_index
from danswer.document_index.vespa.store import VespaIndex
from danswer.indexing.models import InferenceChunk
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.danswer_helper import query_intent
from danswer.search.danswer_helper import recommend_search_flow
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import retrieve_keyword_documents
from danswer.search.search_runner import retrieve_ranked_documents
from danswer.secondary_llm_flows.extract_filters import extract_question_time_filters
from danswer.secondary_llm_flows.query_validation import get_query_answerability
from danswer.secondary_llm_flows.query_validation import stream_query_answerability
from danswer.server.models import HelperResponse
from danswer.server.models import IndexFilters
from danswer.server.models import QAFeedbackRequest
from danswer.server.models import QAResponse
from danswer.server.models import QueryValidationResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import RerankedRetrievalDocs
from danswer.server.models import SearchDoc
from danswer.server.models import SearchFeedbackRequest
from danswer.server.models import SearchResponse
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()

router = APIRouter()


"""Admin-only search endpoints"""


class AdminSearchRequest(BaseModel):
    query: str


class AdminSearchResponse(BaseModel):
    documents: list[SearchDoc]


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
        source_type=None,
        document_set=None,
        time_cutoff=None,
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
    question: QuestionRequest, _: User = Depends(current_user)
) -> HelperResponse:
    query = question.query
    use_keyword = question.use_keyword if question.use_keyword is not None else False
    return recommend_search_flow(query, use_keyword)


@router.post("/query-validation")
def query_validation(
    question: QuestionRequest, _: User = Depends(current_user)
) -> QueryValidationResponse:
    query = question.query
    reasoning, answerable = get_query_answerability(query)
    return QueryValidationResponse(reasoning=reasoning, answerable=answerable)


@router.post("/stream-query-validation")
def stream_query_validation(
    question: QuestionRequest, _: User = Depends(current_user)
) -> StreamingResponse:
    query = question.query
    return StreamingResponse(
        stream_query_answerability(query), media_type="application/json"
    )


@router.post("/keyword-search")
def keyword_search(
    question: QuestionRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    query = question.query
    logger.info(f"Received keyword search query: {query}")

    time_cutoff, favor_recent = extract_question_time_filters(question)
    question.filters.time_cutoff = time_cutoff
    filters = question.filters

    query_event_id = create_query_event(
        query=query,
        selected_flow=SearchType.KEYWORD,
        llm_answer=None,
        user_id=user.id,
        db_session=db_session,
    )

    user_id = None if user is None else user.id
    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=filters.source_type,
        document_set=filters.document_set,
        time_cutoff=filters.time_cutoff,
        access_control_list=user_acl_filters,
    )
    ranked_chunks = retrieve_keyword_documents(
        query=query,
        filters=final_filters,
        favor_recent=favor_recent,
        datastore=get_default_document_index(),
    )
    if not ranked_chunks:
        return SearchResponse(
            top_ranked_docs=None,
            lower_ranked_docs=None,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        )

    top_docs = chunks_to_search_docs(ranked_chunks)
    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=[doc.document_id for doc in top_docs],
        query_id=query_event_id,
        user_id=user_id,
    )

    return SearchResponse(
        top_ranked_docs=top_docs,
        lower_ranked_docs=None,
        query_event_id=query_event_id,
        time_cutoff=time_cutoff,
        favor_recent=favor_recent,
    )


@router.post("/semantic-search")
def semantic_search(
    question: QuestionRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    query = question.query
    logger.info(f"Received semantic search query: {query}")

    time_cutoff, favor_recent = extract_question_time_filters(question)
    question.filters.time_cutoff = time_cutoff
    filters = question.filters

    query_event_id = create_query_event(
        query=query,
        selected_flow=SearchType.SEMANTIC,
        llm_answer=None,
        user_id=user.id,
        db_session=db_session,
    )

    user_id = None if user is None else user.id
    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=filters.source_type,
        document_set=filters.document_set,
        time_cutoff=filters.time_cutoff,
        access_control_list=user_acl_filters,
    )
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query=query,
        filters=final_filters,
        favor_recent=favor_recent,
        datastore=get_default_document_index(),
    )
    if not ranked_chunks:
        return SearchResponse(
            top_ranked_docs=None,
            lower_ranked_docs=None,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        )

    top_docs = chunks_to_search_docs(ranked_chunks)
    other_top_docs = chunks_to_search_docs(unranked_chunks)
    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=[doc.document_id for doc in top_docs],
        query_id=query_event_id,
        user_id=user_id,
    )

    return SearchResponse(
        top_ranked_docs=top_docs,
        lower_ranked_docs=other_top_docs,
        query_event_id=query_event_id,
        time_cutoff=time_cutoff,
        favor_recent=favor_recent,
    )


@router.post("/hybrid-search")
def hybrid_search(
    question: QuestionRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    query = question.query
    logger.info(f"Received hybrid search query: {query}")

    time_cutoff, favor_recent = extract_question_time_filters(question)
    question.filters.time_cutoff = time_cutoff
    filters = question.filters

    query_event_id = create_query_event(
        query=query,
        selected_flow=SearchType.HYBRID,
        llm_answer=None,
        user_id=user.id,
        db_session=db_session,
    )

    user_id = None if user is None else user.id
    user_acl_filters = build_access_filters_for_user(user, db_session)
    final_filters = IndexFilters(
        source_type=filters.source_type,
        document_set=filters.document_set,
        time_cutoff=filters.time_cutoff,
        access_control_list=user_acl_filters,
    )
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query=query,
        filters=final_filters,
        favor_recent=favor_recent,
        datastore=get_default_document_index(),
    )
    if not ranked_chunks:
        return SearchResponse(
            top_ranked_docs=None,
            lower_ranked_docs=None,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        )

    top_docs = chunks_to_search_docs(ranked_chunks)
    other_top_docs = chunks_to_search_docs(unranked_chunks)
    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=[doc.document_id for doc in top_docs],
        query_id=query_event_id,
        user_id=user_id,
    )

    return SearchResponse(
        top_ranked_docs=top_docs,
        lower_ranked_docs=other_top_docs,
        query_event_id=query_event_id,
        time_cutoff=time_cutoff,
        favor_recent=favor_recent,
    )


@router.post("/direct-qa")
def direct_qa(
    question: QuestionRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> QAResponse:
    # Everything handled via answer_qa_query which is also used by default
    # for the DanswerBot flow
    return answer_qa_query(question=question, user=user, db_session=db_session)


@router.post("/stream-direct-qa")
def stream_direct_qa(
    question: QuestionRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    send_packet_debug_msg = "Sending Packet: {}"
    top_documents_key = "top_documents"
    unranked_top_docs_key = "unranked_top_documents"
    predicted_flow_key = "predicted_flow"
    predicted_search_key = "predicted_search"
    query_event_id_key = "query_event_id"

    logger.debug(f"Received QA query: {question.query}")
    logger.debug(f"Query filters: {question.filters}")
    if question.use_keyword:
        logger.debug("User selected Keyword Search")

    @log_generator_function_time()
    def stream_qa_portions(
        disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
    ) -> Generator[str, None, None]:
        answer_so_far: str = ""
        query = question.query
        use_keyword = question.use_keyword
        offset_count = question.offset if question.offset is not None else 0

        time_cutoff, favor_recent = extract_question_time_filters(question)
        question.filters.time_cutoff = time_cutoff
        filters = question.filters

        predicted_search, predicted_flow = query_intent(query)
        if use_keyword is None:
            use_keyword = predicted_search == SearchType.KEYWORD

        user_id = None if user is None else user.id
        user_acl_filters = build_access_filters_for_user(user, db_session)
        final_filters = IndexFilters(
            source_type=filters.source_type,
            document_set=filters.document_set,
            time_cutoff=filters.time_cutoff,
            access_control_list=user_acl_filters,
        )
        if use_keyword:
            ranked_chunks: list[InferenceChunk] | None = retrieve_keyword_documents(
                query=query,
                filters=final_filters,
                favor_recent=favor_recent,
                datastore=get_default_document_index(),
            )
            unranked_chunks: list[InferenceChunk] | None = []
        else:
            ranked_chunks, unranked_chunks = retrieve_ranked_documents(
                query=query,
                filters=final_filters,
                favor_recent=favor_recent,
                datastore=get_default_document_index(),
            )
        if not ranked_chunks:
            logger.debug("No Documents Found")
            empty_docs_result = {
                top_documents_key: None,
                unranked_top_docs_key: None,
                predicted_flow_key: predicted_flow,
                predicted_search_key: predicted_search,
            }
            logger.debug(send_packet_debug_msg.format(empty_docs_result))
            yield get_json_line(empty_docs_result)
            return

        top_docs = chunks_to_search_docs(ranked_chunks)
        unranked_top_docs = chunks_to_search_docs(unranked_chunks)
        initial_response = RerankedRetrievalDocs(
            top_documents=top_docs,
            unranked_top_documents=unranked_top_docs,
            # if generative AI is disabled, set flow as search so frontend
            # doesn't ask the user if they want to run QA over more documents
            predicted_flow=QueryFlow.SEARCH
            if disable_generative_answer
            else predicted_flow,
            predicted_search=predicted_search,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        ).dict()

        logger.debug(send_packet_debug_msg.format(initial_response))
        yield get_json_line(initial_response)

        if disable_generative_answer:
            logger.debug("Skipping QA because generative AI is disabled")
            return

        try:
            qa_model = get_default_qa_model()
        except (UnknownModelError, OpenAIKeyMissing) as e:
            logger.exception("Unable to get QA model")
            error = StreamingError(error=str(e))
            yield get_json_line(error.dict())
            return

        # remove chunks marked as not applicable for QA (e.g. Google Drive file
        # types which can't be parsed). These chunks are useful to show in the
        # search results, but not for QA.
        filtered_ranked_chunks = [
            chunk for chunk in ranked_chunks if not chunk.metadata.get(IGNORE_FOR_QA)
        ]

        # get all chunks that fit into the token limit
        usable_chunks = get_usable_chunks(
            chunks=filtered_ranked_chunks,
            token_limit=NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL,
            offset=offset_count,
        )
        logger.debug(
            f"Chunks fed to LLM: {[chunk.semantic_identifier for chunk in usable_chunks]}"
        )

        try:
            for response_packet in qa_model.answer_question_stream(
                query, usable_chunks
            ):
                if response_packet is None:
                    continue
                if (
                    isinstance(response_packet, DanswerAnswerPiece)
                    and response_packet.answer_piece
                ):
                    answer_so_far = answer_so_far + response_packet.answer_piece
                logger.debug(f"Sending packet: {response_packet}")
                yield get_json_line(response_packet.dict())
        except Exception:
            # exception is logged in the answer_question method, no need to re-log
            logger.exception("Failed to run QA")
            yield get_json_line(
                {"error": "The LLM failed to produce a useable response"}
            )

        query_event_id = create_query_event(
            query=query,
            selected_flow=SearchType.KEYWORD
            if question.use_keyword
            else SearchType.SEMANTIC,
            llm_answer=answer_so_far,
            retrieved_document_ids=[doc.document_id for doc in top_docs],
            user_id=user_id,
            db_session=db_session,
        )

        yield get_json_line({query_event_id_key: query_event_id})

        return

    return StreamingResponse(stream_qa_portions(), media_type="application/json")


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
        db_session=db_session,
    )
