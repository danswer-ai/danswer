from sqlalchemy.orm import Session

from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import DISABLE_GENERATIVE_AI
from danswer.configs.app_configs import NUM_DOCUMENT_TOKENS_FED_TO_GENERATIVE_MODEL
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import IGNORE_FOR_QA
from danswer.datastores.document_index import get_default_document_index
from danswer.db.feedback import create_query_event
from danswer.db.models import User
from danswer.direct_qa.exceptions import OpenAIKeyMissing
from danswer.direct_qa.exceptions import UnknownModelError
from danswer.direct_qa.llm_utils import get_default_qa_model
from danswer.direct_qa.qa_utils import get_usable_chunks
from danswer.search.danswer_helper import query_intent
from danswer.search.keyword_search import retrieve_keyword_documents
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType
from danswer.search.semantic_search import chunks_to_search_docs
from danswer.search.semantic_search import retrieve_ranked_documents
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_function_time

logger = setup_logger()


@log_function_time()
def answer_qa_query(
    question: QuestionRequest,
    user: User | None,
    db_session: Session,
    disable_generative_answer: bool = DISABLE_GENERATIVE_AI,
    answer_generation_timeout: int = QA_TIMEOUT,
) -> QAResponse:
    query = question.query
    filters = question.filters
    use_keyword = question.use_keyword
    offset_count = question.offset if question.offset is not None else 0
    logger.info(f"Received QA query: {query}")

    query_event_id = create_query_event(
        query=query,
        selected_flow=SearchType.KEYWORD,
        llm_answer=None,
        user_id=user.id if user is not None else None,
        db_session=db_session,
    )

    predicted_search, predicted_flow = query_intent(query)
    if use_keyword is None:
        use_keyword = predicted_search == SearchType.KEYWORD

    user_id = None if user is None else user.id
    if use_keyword:
        ranked_chunks: list[InferenceChunk] | None = retrieve_keyword_documents(
            query, user_id, filters, get_default_document_index()
        )
        unranked_chunks: list[InferenceChunk] | None = []
    else:
        ranked_chunks, unranked_chunks = retrieve_ranked_documents(
            query, user_id, filters, get_default_document_index()
        )
    if not ranked_chunks:
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=None,
            lower_ranked_docs=None,
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
            query_event_id=query_event_id,
        )

    if disable_generative_answer:
        logger.debug("Skipping QA because generative AI is disabled")
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=chunks_to_search_docs(ranked_chunks),
            lower_ranked_docs=chunks_to_search_docs(unranked_chunks),
            # set flow as search so frontend doesn't ask the user if they want
            # to run QA over more documents
            predicted_flow=QueryFlow.SEARCH,
            predicted_search=predicted_search,
            query_event_id=query_event_id,
        )

    try:
        qa_model = get_default_qa_model(timeout=answer_generation_timeout)
    except (UnknownModelError, OpenAIKeyMissing) as e:
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=chunks_to_search_docs(ranked_chunks),
            lower_ranked_docs=chunks_to_search_docs(unranked_chunks),
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
            error_msg=str(e),
            query_event_id=query_event_id,
        )

    # remove chunks marked as not applicable for QA (e.g. Google Drive file
    # types which can't be parsed). These chunks are useful to show in the
    # search results, but not for QA.
    filtered_ranked_chunks = [
        chunk for chunk in ranked_chunks if chunk.metadata.get(IGNORE_FOR_QA)
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
        answer, quotes = qa_model.answer_question(query, usable_chunks)
    except Exception as e:
        # exception is logged in the answer_question method, no need to re-log
        answer, quotes = None, None
        error_msg = f"Error occurred in call to LLM - {e}"

    return QAResponse(
        answer=answer.answer if answer else None,
        quotes=quotes.quotes if quotes else None,
        top_ranked_docs=chunks_to_search_docs(ranked_chunks),
        lower_ranked_docs=chunks_to_search_docs(unranked_chunks),
        predicted_flow=predicted_flow,
        predicted_search=predicted_search,
        error_msg=error_msg,
        query_event_id=query_event_id,
    )
