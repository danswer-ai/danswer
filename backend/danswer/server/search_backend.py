import json
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
from danswer.search.keyword_search import retrieve_keyword_documents
from danswer.search.semantic_search import chunks_to_search_docs
from danswer.search.semantic_search import retrieve_ranked_documents
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchResponse
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse

logger = setup_logger()

router = APIRouter()


@router.get("/semantic-search")
def semantic_search(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> SearchResponse:
    query = question.query
    collection = question.collection
    filters = json.loads(question.filters) if question.filters is not None else None
    logger.info(f"Received semantic search query: {query}")

    user_id = None if user is None else int(user.id)
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query, user_id, filters, QdrantIndex(collection)
    )
    if not ranked_chunks:
        return SearchResponse(top_ranked_docs=None, semi_ranked_docs=None)

    top_docs = chunks_to_search_docs(ranked_chunks)
    other_top_docs = chunks_to_search_docs(unranked_chunks)

    return SearchResponse(top_ranked_docs=top_docs, semi_ranked_docs=other_top_docs)


@router.get("/keyword-search", response_model=SearchResponse)
def keyword_search(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> SearchResponse:
    query = question.query
    collection = question.collection
    filters = json.loads(question.filters) if question.filters is not None else None
    logger.info(f"Received keyword search query: {query}")

    user_id = None if user is None else int(user.id)
    ranked_chunks = retrieve_keyword_documents(
        query, user_id, filters, TypesenseIndex(collection)
    )
    if not ranked_chunks:
        return SearchResponse(top_ranked_docs=None, semi_ranked_docs=None)

    top_docs = chunks_to_search_docs(ranked_chunks)
    return SearchResponse(top_ranked_docs=top_docs, semi_ranked_docs=None)


@router.get("/direct-qa", response_model=QAResponse)
def direct_qa(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> QAResponse:
    start_time = time.time()

    query = question.query
    collection = question.collection
    filters = json.loads(question.filters) if question.filters is not None else None
    use_keyword = question.use_keyword
    logger.info(f"Received QA query: {query}")

    user_id = None if user is None else int(user.id)
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
            answer=None, quotes=None, ranked_documents=None, unranked_documents=None
        )

    qa_model = get_default_backend_qa_model(timeout=QA_TIMEOUT)
    try:
        answer, quotes = qa_model.answer_question(
            query, ranked_chunks[:NUM_GENERATIVE_AI_INPUT_DOCS]
        )
    except Exception:
        # exception is logged in the answer_question method, no need to re-log
        answer, quotes = None, None

    logger.info(f"Total QA took {time.time() - start_time} seconds")

    return QAResponse(
        answer=answer,
        quotes=quotes,
        ranked_documents=chunks_to_search_docs(ranked_chunks),
        unranked_documents=chunks_to_search_docs(unranked_chunks),
    )


@router.get("/stream-direct-qa")
def stream_direct_qa(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> StreamingResponse:
    top_documents_key = "top_documents"
    unranked_top_docs_key = "unranked_top_documents"

    def stream_qa_portions() -> Generator[str, None, None]:
        query = question.query
        collection = question.collection
        filters = json.loads(question.filters) if question.filters is not None else None
        use_keyword = question.use_keyword
        logger.info(f"Received QA query: {query}")

        user_id = None if user is None else int(user.id)
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
            yield get_json_line({top_documents_key: None, unranked_top_docs_key: None})
            return

        top_docs = chunks_to_search_docs(ranked_chunks)
        unranked_top_docs = chunks_to_search_docs(unranked_chunks)
        top_docs_dict = {
            top_documents_key: [top_doc.json() for top_doc in top_docs],
            unranked_top_docs_key: [doc.json() for doc in unranked_top_docs],
        }
        yield get_json_line(top_docs_dict)

        qa_model = get_default_backend_qa_model(timeout=QA_TIMEOUT)
        try:
            for response_dict in qa_model.answer_question_stream(
                query, ranked_chunks[:NUM_GENERATIVE_AI_INPUT_DOCS]
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
