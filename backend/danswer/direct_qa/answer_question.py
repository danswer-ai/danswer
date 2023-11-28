from collections.abc import Callable
from collections.abc import Iterator
from functools import partial
from typing import cast

from sqlalchemy.orm import Session

from danswer.configs.app_configs import CHUNK_SIZE
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import DISABLE_LLM_CHUNK_FILTER
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import QUERY_EVENT_ID
from danswer.db.chat import fetch_chat_session_by_id
from danswer.db.feedback import create_query_event
from danswer.db.feedback import update_query_event_llm_answer
from danswer.db.feedback import update_query_event_retrieved_documents
from danswer.db.models import User
from danswer.direct_qa.factory import get_default_qa_model
from danswer.direct_qa.factory import get_qa_model_for_persona
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import StreamingError
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_utils import get_chunks_for_qa
from danswer.document_index.factory import get_default_document_index
from danswer.indexing.models import InferenceChunk
from danswer.search.models import QueryFlow
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.models import SearchType
from danswer.search.request_preprocessing import retrieval_preprocessing
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import full_chunk_search
from danswer.search.search_runner import full_chunk_search_generator
from danswer.secondary_llm_flows.answer_validation import get_answer_validity
from danswer.server.models import LLMRelevanceFilterResponse
from danswer.server.models import NewMessageRequest
from danswer.server.models import QADocsResponse
from danswer.server.models import QAResponse
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()


@log_function_time()
def answer_qa_query(
    new_message_request: NewMessageRequest,
    user: User | None,
    db_session: Session,
    disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
    answer_generation_timeout: int = QA_TIMEOUT,
    enable_reflexion: bool = False,
    bypass_acl: bool = False,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    llm_metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
) -> QAResponse:
    query = new_message_request.query
    offset_count = (
        new_message_request.offset if new_message_request.offset is not None else 0
    )
    logger.info(f"Received QA query: {query}")

    # create record for this query in Postgres
    query_event_id = create_query_event(
        query=new_message_request.query,
        chat_session_id=new_message_request.chat_session_id,
        search_type=new_message_request.search_type,
        llm_answer=None,
        user_id=user.id if user is not None else None,
        db_session=db_session,
    )

    retrieval_request, predicted_search_type, predicted_flow = retrieval_preprocessing(
        new_message_request=new_message_request,
        user=user,
        db_session=db_session,
        bypass_acl=bypass_acl,
    )

    # Set flow as search so frontend doesn't ask the user if they want to run QA over more docs
    if disable_generative_answer:
        predicted_flow = QueryFlow.SEARCH

    top_chunks, llm_chunk_selection = full_chunk_search(
        query=retrieval_request,
        document_index=get_default_document_index(),
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )

    top_docs = chunks_to_search_docs(top_chunks)

    partial_response = partial(
        QAResponse,
        top_documents=chunks_to_search_docs(top_chunks),
        predicted_flow=predicted_flow,
        predicted_search=predicted_search_type,
        query_event_id=query_event_id,
        source_type=retrieval_request.filters.source_type,
        time_cutoff=retrieval_request.filters.time_cutoff,
        favor_recent=retrieval_request.favor_recent,
    )

    if disable_generative_answer or not top_docs:
        return partial_response(
            answer=None,
            quotes=None,
        )

    # update record for this query to include top docs
    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=[doc.document_id for doc in top_chunks]
        if top_chunks
        else [],
        query_id=query_event_id,
        user_id=None if user is None else user.id,
    )

    try:
        qa_model = get_default_qa_model(
            timeout=answer_generation_timeout,
            real_time_flow=new_message_request.real_time,
        )
    except Exception as e:
        return partial_response(
            answer=None,
            quotes=None,
            error_msg=str(e),
        )

    llm_chunks_indices = get_chunks_for_qa(
        chunks=top_chunks,
        llm_chunk_selection=llm_chunk_selection,
        batch_offset=offset_count,
    )
    llm_chunks = [top_chunks[i] for i in llm_chunks_indices]
    logger.debug(
        f"Chunks fed to LLM: {[chunk.semantic_identifier for chunk in llm_chunks]}"
    )

    error_msg = None
    try:
        d_answer, quotes = qa_model.answer_question(
            query, llm_chunks, metrics_callback=llm_metrics_callback
        )
    except Exception as e:
        # exception is logged in the answer_question method, no need to re-log
        d_answer, quotes = None, None
        error_msg = f"Error occurred in call to LLM - {e}"  # Used in the QAResponse

    # update query event created by call to `danswer_search` with the LLM answer
    if d_answer and d_answer.answer is not None:
        update_query_event_llm_answer(
            db_session=db_session,
            llm_answer=d_answer.answer,
            query_id=query_event_id,
            user_id=None if user is None else user.id,
        )

    validity = None
    if not new_message_request.real_time and enable_reflexion and d_answer is not None:
        validity = False
        if d_answer.answer is not None:
            validity = get_answer_validity(query, d_answer.answer)

    return partial_response(
        answer=d_answer.answer if d_answer else None,
        quotes=quotes.quotes if quotes else None,
        eval_res_valid=validity,
        llm_chunks_indices=llm_chunks_indices,
        error_msg=error_msg,
    )


@log_generator_function_time()
def answer_qa_query_stream(
    new_message_request: NewMessageRequest,
    user: User | None,
    db_session: Session,
    disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
) -> Iterator[str]:
    logger.debug(
        f"Received QA query ({new_message_request.search_type.value} search): {new_message_request.query}"
    )
    logger.debug(f"Query filters: {new_message_request.filters}")

    answer_so_far: str = ""
    query = new_message_request.query
    offset_count = (
        new_message_request.offset if new_message_request.offset is not None else 0
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
    chat_session = fetch_chat_session_by_id(
        chat_session_id=new_message_request.chat_session_id, db_session=db_session
    )
    persona = chat_session.persona
    persona_skip_llm_chunk_filter = (
        not persona.apply_llm_relevance_filter if persona else None
    )
    persona_num_chunks = persona.num_chunks if persona else None
    if persona:
        logger.info(f"Using persona: {persona.name}")
        logger.info(
            "Persona retrieval settings: skip_llm_chunk_filter: "
            f"{persona_skip_llm_chunk_filter}, "
            f"num_chunks: {persona_num_chunks}"
        )

    retrieval_request, predicted_search_type, predicted_flow = retrieval_preprocessing(
        new_message_request=new_message_request,
        user=user,
        db_session=db_session,
        skip_llm_chunk_filter=persona_skip_llm_chunk_filter
        if persona_skip_llm_chunk_filter is not None
        else DISABLE_LLM_CHUNK_FILTER,
    )
    # if a persona is specified, always respond with an answer
    if persona:
        predicted_flow = QueryFlow.QUESTION_ANSWER

    search_generator = full_chunk_search_generator(
        query=retrieval_request,
        document_index=get_default_document_index(),
    )

    # first fetch and return to the UI the top chunks so the user can
    # immediately see some results
    top_chunks = cast(list[InferenceChunk], next(search_generator))
    top_docs = chunks_to_search_docs(top_chunks)
    initial_response = QADocsResponse(
        top_documents=top_docs,
        # if generative AI is disabled, set flow as search so frontend
        # doesn't ask the user if they want to run QA over more documents
        predicted_flow=QueryFlow.SEARCH
        if disable_generative_answer
        else cast(QueryFlow, predicted_flow),
        predicted_search=cast(SearchType, predicted_search_type),
        time_cutoff=retrieval_request.filters.time_cutoff,
        favor_recent=retrieval_request.favor_recent,
    ).dict()
    yield get_json_line(initial_response)

    if not top_chunks:
        logger.debug("No Documents Found")
        return

    # update record for this query to include top docs
    update_query_event_retrieved_documents(
        db_session=db_session,
        retrieved_document_ids=[doc.document_id for doc in top_chunks]
        if top_chunks
        else [],
        query_id=query_event_id,
        user_id=None if user is None else user.id,
    )

    # next get the final chunks to be fed into the LLM
    llm_chunk_selection = cast(list[bool], next(search_generator))
    llm_chunks_indices = get_chunks_for_qa(
        chunks=top_chunks,
        llm_chunk_selection=llm_chunk_selection,
        token_limit=persona_num_chunks * CHUNK_SIZE
        if persona_num_chunks
        else NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL,
        batch_offset=offset_count,
    )
    llm_relevance_filtering_response = LLMRelevanceFilterResponse(
        relevant_chunk_indices=[
            index for index, value in enumerate(llm_chunk_selection) if value
        ]
        if not retrieval_request.skip_llm_chunk_filter
        else []
    ).dict()
    yield get_json_line(llm_relevance_filtering_response)

    if disable_generative_answer:
        logger.debug("Skipping QA because generative AI is disabled")
        return

    try:
        if not persona:
            qa_model = get_default_qa_model()
        else:
            qa_model = get_qa_model_for_persona(persona=persona)
    except Exception as e:
        logger.exception("Unable to get QA model")
        error = StreamingError(error=str(e))
        yield get_json_line(error.dict())
        return

    llm_chunks = [top_chunks[i] for i in llm_chunks_indices]
    logger.debug(
        f"Chunks fed to LLM: {[chunk.semantic_identifier for chunk in llm_chunks]}"
    )

    try:
        for response_packet in qa_model.answer_question_stream(query, llm_chunks):
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
        error = StreamingError(error="The LLM failed to produce a useable response")
        yield get_json_line(error.dict())

    # update query event created by call to `danswer_search` with the LLM answer
    update_query_event_llm_answer(
        db_session=db_session,
        llm_answer=answer_so_far,
        query_id=query_event_id,
        user_id=None if user is None else user.id,
    )

    yield get_json_line({QUERY_EVENT_ID: query_event_id})
