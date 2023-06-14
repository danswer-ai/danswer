import time
from collections.abc import Generator

from danswer.auth.users import current_user
from danswer.chunking.models import InferenceChunk
from danswer.configs.app_configs import NUM_GENERATIVE_AI_INPUT_DOCS
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.db.models import User
from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.question_answer import get_json_line
from danswer.search.danswer_helper import query_intent
from danswer.search.danswer_helper import recommend_search_flow
from danswer.search.keyword_search import retrieve_keyword_documents
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType
from danswer.search.semantic_search import chunks_to_search_docs
from danswer.search.semantic_search import retrieve_ranked_documents
from danswer.server.models import HelperResponse
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchResponse
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse

logger = setup_logger()

router = APIRouter()


@router.get("/search-intent")
def get_search_type(
    question: QuestionRequest = Depends(), _: User = Depends(current_user)
) -> HelperResponse:
    query = question.query
    use_keyword = question.use_keyword if question.use_keyword is not None else False
    return recommend_search_flow(query, use_keyword)


@router.post("/semantic-search")
def semantic_search(
    question: QuestionRequest, user: User = Depends(current_user)
) -> SearchResponse:
    query = question.query
    collection = question.collection
    filters = question.filters
    logger.info(f"Received semantic search query: {query}")

    user_id = None if user is None else user.id
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query, user_id, filters, QdrantIndex(collection)
    )
    if not ranked_chunks:
        return SearchResponse(top_ranked_docs=None, lower_ranked_docs=None)

    top_docs = chunks_to_search_docs(ranked_chunks)
    other_top_docs = chunks_to_search_docs(unranked_chunks)

    return SearchResponse(top_ranked_docs=top_docs, lower_ranked_docs=other_top_docs)


@router.post("/keyword-search")
def keyword_search(
    question: QuestionRequest, user: User = Depends(current_user)
) -> SearchResponse:
    query = question.query
    collection = question.collection
    filters = question.filters
    logger.info(f"Received keyword search query: {query}")

    user_id = None if user is None else user.id
    ranked_chunks = retrieve_keyword_documents(
        query, user_id, filters, TypesenseIndex(collection)
    )
    if not ranked_chunks:
        return SearchResponse(top_ranked_docs=None, lower_ranked_docs=None)

    top_docs = chunks_to_search_docs(ranked_chunks)
    return SearchResponse(top_ranked_docs=top_docs, lower_ranked_docs=None)


@router.post("/direct-qa")
def direct_qa(
    question: QuestionRequest, user: User = Depends(current_user)
) -> QAResponse:
    start_time = time.time()

    query = question.query
    collection = question.collection
    filters = question.filters
    use_keyword = question.use_keyword
    offset_count = question.offset if question.offset is not None else 0
    logger.info(f"Received QA query: {query}")

    predicted_search, predicted_flow = query_intent(query)
    if use_keyword is None:
        use_keyword = predicted_search == SearchType.KEYWORD

    user_id = None if user is None else user.id
    if use_keyword:
        ranked_chunks: list[InferenceChunk] | None = retrieve_keyword_documents(
            query, user_id, filters, TypesenseIndex(collection)
        )
        unranked_chunks: list[InferenceChunk] | None = []
    else:
        ranked_chunks, unranked_chunks = retrieve_ranked_documents(
            query, user_id, filters, QdrantIndex(collection)
        )
    if not ranked_chunks:
        return QAResponse(
            answer=None,
            quotes=None,
            top_ranked_docs=None,
            lower_ranked_docs=None,
            predicted_flow=predicted_flow,
            predicted_search=predicted_search,
        )

    qa_model = get_default_backend_qa_model(timeout=QA_TIMEOUT)
    chunk_offset = offset_count * NUM_GENERATIVE_AI_INPUT_DOCS
    if chunk_offset >= len(ranked_chunks):
        raise ValueError("Chunks offset too large, should not retry this many times")
    try:
        answer, quotes = qa_model.answer_question(
            query,
            ranked_chunks[chunk_offset : chunk_offset + NUM_GENERATIVE_AI_INPUT_DOCS],
        )
    except Exception:
        # exception is logged in the answer_question method, no need to re-log
        answer, quotes = None, None

    logger.info(f"Total QA took {time.time() - start_time} seconds")

    return QAResponse(
        answer=answer,
        quotes=quotes,
        top_ranked_docs=chunks_to_search_docs(ranked_chunks),
        lower_ranked_docs=chunks_to_search_docs(unranked_chunks),
        predicted_flow=predicted_flow,
        predicted_search=predicted_search,
    )


@router.post("/stream-direct-qa")
def stream_direct_qa(
    question: QuestionRequest, user: User = Depends(current_user)
) -> StreamingResponse:
    top_documents_key = "top_documents"
    unranked_top_docs_key = "unranked_top_documents"
    predicted_flow_key = "predicted_flow"
    predicted_search_key = "predicted_search"

    def stream_qa_portions() -> Generator[str, None, None]:
        query = question.query
        collection = question.collection
        filters = question.filters
        use_keyword = question.use_keyword
        offset_count = question.offset if question.offset is not None else 0
        logger.info(f"Received QA query: {query}")

        predicted_search, predicted_flow = query_intent(query)
        if use_keyword is None:
            use_keyword = predicted_search == SearchType.KEYWORD

        user_id = None if user is None else user.id
        if use_keyword:
            ranked_chunks: list[InferenceChunk] | None = retrieve_keyword_documents(
                query, user_id, filters, TypesenseIndex(collection)
            )
            unranked_chunks: list[InferenceChunk] | None = []
        else:
            ranked_chunks, unranked_chunks = retrieve_ranked_documents(
                query, user_id, filters, QdrantIndex(collection)
            )
        if not ranked_chunks:
            yield get_json_line(
                {
                    top_documents_key: None,
                    unranked_top_docs_key: None,
                    predicted_flow_key: predicted_flow,
                    predicted_search_key: predicted_search,
                }
            )
            return

        top_docs = chunks_to_search_docs(ranked_chunks)
        unranked_top_docs = chunks_to_search_docs(unranked_chunks)
        initial_response_dict = {
            top_documents_key: [top_doc.json() for top_doc in top_docs],
            unranked_top_docs_key: [doc.json() for doc in unranked_top_docs],
            predicted_flow_key: predicted_flow,
            predicted_search_key: predicted_search,
        }
        yield get_json_line(initial_response_dict)

        qa_model = get_default_backend_qa_model(timeout=QA_TIMEOUT)
        chunk_offset = offset_count * NUM_GENERATIVE_AI_INPUT_DOCS
        if chunk_offset >= len(ranked_chunks):
            raise ValueError(
                "Chunks offset too large, should not retry this many times"
            )
        try:
            for response_dict in qa_model.answer_question_stream(
                query,
                ranked_chunks[
                    chunk_offset : chunk_offset + NUM_GENERATIVE_AI_INPUT_DOCS
                ],
            ):
                if response_dict is None:
                    continue
                logger.debug(response_dict)
                yield get_json_line(response_dict)
        except Exception:
            # exception is logged in the answer_question method, no need to re-log
            pass
        return

    return StreamingResponse(stream_qa_portions(), media_type="application/json")
