from collections.abc import Callable
from collections.abc import Iterator

from sqlalchemy.orm import Session

from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.db.feedback import create_query_event
from danswer.db.models import User
from danswer.direct_qa.factory import get_default_qa_model
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.direct_qa.interfaces import StreamingError
from danswer.direct_qa.models import LLMMetricsContainer
from danswer.direct_qa.qa_utils import get_usable_chunks
from danswer.document_index.factory import get_default_document_index
from danswer.search.danswer_helper import query_intent
from danswer.search.models import QueryFlow
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.search_runner import chunks_to_search_docs
from danswer.search.search_runner import danswer_search
from danswer.secondary_llm_flows.answer_validation import get_answer_validity
from danswer.secondary_llm_flows.extract_filters import extract_question_time_filters
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import RerankedRetrievalDocs
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time
from danswer.utils.timing import log_generator_function_time

logger = setup_logger()


@log_function_time()
def answer_qa_query(
    question: QuestionRequest,
    user: User | None,
    db_session: Session,
    disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
    answer_generation_timeout: int = QA_TIMEOUT,
    real_time_flow: bool = True,
    enable_reflexion: bool = False,
    retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
    | None = None,
    rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    llm_metrics_callback: Callable[[LLMMetricsContainer], None] | None = None,
) -> QAResponse:
    query = question.query
    offset_count = question.offset if question.offset is not None else 0
    logger.info(f"Received QA query: {query}")

    time_cutoff, favor_recent = extract_question_time_filters(question)
    question.filters.time_cutoff = time_cutoff
    question.favor_recent = favor_recent

    ranked_chunks, unranked_chunks, query_event_id = danswer_search(
        question=question,
        user=user,
        db_session=db_session,
        document_index=get_default_document_index(),
        retrieval_metrics_callback=retrieval_metrics_callback,
        rerank_metrics_callback=rerank_metrics_callback,
    )

    # TODO retire this
    predicted_search, predicted_flow = query_intent(query)

    if not ranked_chunks:
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=None,
            lower_ranked_docs=None,
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        )

    top_docs = chunks_to_search_docs(ranked_chunks)
    unranked_top_docs = chunks_to_search_docs(unranked_chunks)

    if disable_generative_answer:
        logger.debug("Skipping QA because generative AI is disabled")
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=top_docs,
            lower_ranked_docs=unranked_top_docs,
            # set flow as search so frontend doesn't ask the user if they want
            # to run QA over more documents
            predicted_flow=QueryFlow.SEARCH,
            predicted_search=predicted_search,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
        )

    try:
        qa_model = get_default_qa_model(
            timeout=answer_generation_timeout, real_time_flow=real_time_flow
        )
    except Exception as e:
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=top_docs,
            lower_ranked_docs=unranked_top_docs,
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
            error_msg=str(e),
        )

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

    error_msg = None
    try:
        d_answer, quotes = qa_model.answer_question(
            query, usable_chunks, metrics_callback=llm_metrics_callback
        )
    except Exception as e:
        # exception is logged in the answer_question method, no need to re-log
        d_answer, quotes = None, None
        error_msg = f"Error occurred in call to LLM - {e}"  # Used in the QAResponse

    if not real_time_flow and enable_reflexion and d_answer is not None:
        valid = False
        if d_answer.answer is not None:
            valid = get_answer_validity(query, d_answer.answer)

        return QAResponse(
            answer=d_answer.answer if d_answer else None,
            quotes=quotes.quotes if quotes else None,
            top_ranked_docs=top_docs,
            lower_ranked_docs=unranked_top_docs,
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
            eval_res_valid=True if valid else False,
            query_event_id=query_event_id,
            time_cutoff=time_cutoff,
            favor_recent=favor_recent,
            error_msg=error_msg,
        )

    return QAResponse(
        answer=d_answer.answer if d_answer else None,
        quotes=quotes.quotes if quotes else None,
        top_ranked_docs=top_docs,
        lower_ranked_docs=unranked_top_docs,
        predicted_flow=predicted_flow,
        predicted_search=predicted_search,
        query_event_id=query_event_id,
        time_cutoff=time_cutoff,
        favor_recent=favor_recent,
        error_msg=error_msg,
    )


@log_generator_function_time()
def answer_qa_query_stream(
    question: QuestionRequest,
    user: User | None,
    db_session: Session,
    disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
) -> Iterator[str]:
    logger.debug(
        f"Received QA query ({question.search_type.value} search): {question.query}"
    )
    logger.debug(f"Query filters: {question.filters}")

    answer_so_far: str = ""
    query = question.query
    offset_count = question.offset if question.offset is not None else 0

    time_cutoff, favor_recent = extract_question_time_filters(question)
    question.filters.time_cutoff = time_cutoff
    question.favor_recent = favor_recent

    ranked_chunks, unranked_chunks, query_event_id = danswer_search(
        question=question,
        user=user,
        db_session=db_session,
        document_index=get_default_document_index(),
    )

    # TODO retire this
    predicted_search, predicted_flow = query_intent(query)

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

    logger.debug(f"Sending Initial Retrival Results: {initial_response}")
    yield get_json_line(initial_response)

    if not ranked_chunks:
        logger.debug("No Documents Found")
        return

    if disable_generative_answer:
        logger.debug("Skipping QA because generative AI is disabled")
        return

    try:
        qa_model = get_default_qa_model()
    except Exception as e:
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
        for response_packet in qa_model.answer_question_stream(query, usable_chunks):
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

    query_event_id = create_query_event(
        query=query,
        search_type=question.search_type,
        llm_answer=answer_so_far,
        retrieved_document_ids=[doc.document_id for doc in top_docs],
        user_id=None if user is None else user.id,
        db_session=db_session,
    )

    yield get_json_line({"query_event_id": query_event_id})
