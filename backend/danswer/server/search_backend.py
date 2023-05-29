import time
from collections.abc import Generator

from danswer.auth.users import current_user
from danswer.configs.app_configs import KEYWORD_MAX_HITS
from danswer.configs.app_configs import NUM_GENERATIVE_AI_INPUT_DOCS
from danswer.configs.app_configs import QA_TIMEOUT
from danswer.configs.constants import CONTENT
from danswer.configs.constants import SOURCE_LINKS
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.db.models import User
from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.question_answer import get_json_line
from danswer.semantic_search.semantic_search import retrieve_ranked_documents
from danswer.server.models import KeywordResponse
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.server.models import SearchDoc
from danswer.server.models import SearchResponse
from danswer.server.models import UserRoleResponse
from danswer.utils.clients import get_typesense_client
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse


logger = setup_logger()

router = APIRouter()


@router.get("/get-user-role", response_model=UserRoleResponse)
async def get_user_role(user: User = Depends(current_user)) -> UserRoleResponse:
    if user is None:
        raise ValueError("Invalid or missing user.")
    return UserRoleResponse(role=user.role)


@router.get("/semantic-search")
def semantic_search(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> SearchResponse:
    query = question.query
    collection = question.collection
    filters = question.filters
    logger.info(f"Received semantic search for: {query}")

    user_id = None if user is None else int(user.id)
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query, user_id, filters, QdrantIndex(collection)
    )
    if not ranked_chunks:
        return SearchResponse(top_ranked_docs=None, semi_ranked_docs=None)

    top_docs = [
        SearchDoc(
            semantic_identifier=chunk.semantic_identifier,
            link=chunk.source_links.get(0) if chunk.source_links else None,
            blurb=chunk.blurb,
            source_type=chunk.source_type,
        )
        for chunk in ranked_chunks
    ]

    other_top_docs = (
        [
            SearchDoc(
                semantic_identifier=chunk.semantic_identifier,
                link=chunk.source_links.get(0) if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
            )
            for chunk in unranked_chunks
        ]
        if unranked_chunks
        else []
    )
    return SearchResponse(top_ranked_docs=top_docs, semi_ranked_docs=other_top_docs)


@router.get("/keyword-search", response_model=KeywordResponse)
def keyword_search(
    question: QuestionRequest = Depends(), _: User = Depends(current_user)
) -> KeywordResponse:
    ts_client = get_typesense_client()
    query = question.query
    collection = question.collection

    logger.info(f"Received keyword query: {query}")
    start_time = time.time()

    search_results = ts_client.collections[collection].documents.search(
        {
            "q": query,
            "query_by": CONTENT,
            "per_page": KEYWORD_MAX_HITS,
            "limit_hits": KEYWORD_MAX_HITS,
        }
    )

    hits = search_results["hits"]
    sources = [hit["document"][SOURCE_LINKS][0] for hit in hits]

    total_time = time.time() - start_time
    logger.info(f"Total Keyword Search took {total_time} seconds")

    return KeywordResponse(results=sources)


@router.get("/direct-qa", response_model=QAResponse)
def direct_qa(
    question: QuestionRequest = Depends(), user: User = Depends(current_user)
) -> QAResponse:
    start_time = time.time()

    query = question.query
    collection = question.collection
    filters = question.filters
    logger.info(f"Received semantic query: {query}")

    user_id = None if user is None else int(user.id)
    ranked_chunks, unranked_chunks = retrieve_ranked_documents(
        query, user_id, filters, QdrantIndex(collection)
    )
    if not ranked_chunks:
        return QAResponse(
            answer=None, quotes=None, ranked_documents=None, unranked_documents=None
        )

    top_docs = [
        SearchDoc(
            semantic_identifier=chunk.semantic_identifier,
            link=chunk.source_links.get(0) if chunk.source_links else None,
            blurb=chunk.blurb,
            source_type=chunk.source_type,
        )
        for chunk in ranked_chunks
    ]

    other_top_docs = (
        [
            SearchDoc(
                semantic_identifier=chunk.semantic_identifier,
                link=chunk.source_links.get(0) if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
            )
            for chunk in unranked_chunks
        ]
        if unranked_chunks
        else []
    )

    qa_model = get_default_backend_qa_model(
        internal_model="openai-completion", model_versiontimeout=QA_TIMEOUT
    )
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
        ranked_documents=top_docs,
        unranked_documents=other_top_docs,
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
        filters = question.filters
        logger.info(f"Received semantic query: {query}")

        user_id = None if user is None else int(user.id)
        ranked_chunks, unranked_chunks = retrieve_ranked_documents(
            query, user_id, filters, QdrantIndex(collection)
        )
        if not ranked_chunks:
            yield get_json_line({top_documents_key: None, unranked_top_docs_key: None})
            return

        top_docs = [
            SearchDoc(
                semantic_identifier=chunk.semantic_identifier,
                link=chunk.source_links.get(0) if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
            )
            for chunk in ranked_chunks
        ]
        unranked_top_docs = (
            [
                SearchDoc(
                    semantic_identifier=chunk.semantic_identifier,
                    link=chunk.source_links.get(0) if chunk.source_links else None,
                    blurb=chunk.blurb,
                    source_type=chunk.source_type,
                )
                for chunk in unranked_chunks
            ]
            if unranked_chunks
            else []
        )

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
