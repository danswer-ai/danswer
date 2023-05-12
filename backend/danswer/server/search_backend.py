import time
from http import HTTPStatus

from danswer.auth.schemas import UserRole
from danswer.auth.users import current_active_user
from danswer.auth.users import current_admin_user
from danswer.configs.app_configs import KEYWORD_MAX_HITS
from danswer.configs.app_configs import NUM_RERANKED_RESULTS
from danswer.configs.constants import CONTENT
from danswer.configs.constants import SOURCE_LINKS
from danswer.datastores import create_datastore
from danswer.db.engine import build_async_engine
from danswer.db.models import User
from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.question_answer import yield_json_line
from danswer.semantic_search.semantic_search import retrieve_ranked_documents
from danswer.server.models import KeywordResponse
from danswer.server.models import QAQuestion
from danswer.server.models import QAResponse
from danswer.server.models import SearchDoc
from danswer.server.models import ServerStatus
from danswer.server.models import UserByEmail
from danswer.server.models import UserRoleResponse
from danswer.utils.clients import TSClient
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi.responses import StreamingResponse
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

logger = setup_logger()

router = APIRouter()


# TODO delete this useless endpoint once frontend is integrated with auth
@router.get("/test-auth")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email} who is a {user.role}!"}


# TODO delete this useless endpoint once frontend is integrated with auth
@router.get("/test-admin")
async def admin_route(user: User = Depends(current_admin_user)):
    return {"message": f"Hello {user.email} who is a {user.role}!"}


# TODO DAN-39 delete this once oauth is built out and tested
@router.api_route("/test", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_endpoint(request: Request):
    print(request)


@router.get("/get-user-role", response_model=UserRoleResponse)
async def get_user_role(user: User = Depends(current_active_user)):
    return UserRoleResponse(role=user.role)


@router.get("/", response_model=ServerStatus)
@router.get("/status", response_model=ServerStatus)
def read_server_status():
    return ServerStatus(status=HTTPStatus.OK.value)


@router.patch("/promote-user-to-admin", response_model=None)
async def promote_admin(
    user_email: UserByEmail, user: User = Depends(current_active_user)
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    async with AsyncSession(build_async_engine()) as asession:
        user_db = SQLAlchemyUserDatabase(asession, User)  # type: ignore
        user_to_promote = await user_db.get_by_email(user_email.user_email)
        if not user_to_promote:
            raise HTTPException(status_code=404, detail="User not found")
        user_to_promote.role = UserRole.ADMIN
        asession.add(user_to_promote)
        await asession.commit()
    return


@router.get("/direct-qa", response_model=QAResponse)
def direct_qa(question: QAQuestion = Depends()) -> QAResponse:
    start_time = time.time()

    query = question.query
    collection = question.collection
    filters = question.filters
    logger.info(f"Received semantic query: {query}")

    ranked_chunks = retrieve_ranked_documents(
        query, filters, create_datastore(collection)
    )
    if not ranked_chunks:
        return QAResponse(answer=None, quotes=None, ranked_documents=None)

    top_docs = [
        SearchDoc(
            semantic_name=chunk.semantic_identifier,
            link=chunk.source_links.get("0") if chunk.source_links else None,
            blurb=chunk.blurb,
            source_type=chunk.source_type,
        )
        for chunk in ranked_chunks
    ]

    qa_model = get_default_backend_qa_model()
    answer, quotes = qa_model.answer_question(
        query, ranked_chunks[:NUM_RERANKED_RESULTS]
    )

    logger.info(f"Total QA took {time.time() - start_time} seconds")

    return QAResponse(answer=answer, quotes=quotes, ranked_documents=top_docs)


@router.get("/stream-direct-qa")
def stream_direct_qa(question: QAQuestion = Depends()):
    top_documents_key = "top_documents"

    def stream_qa_portions():
        query = question.query
        collection = question.collection
        filters = question.filters
        logger.info(f"Received semantic query: {query}")

        ranked_chunks = retrieve_ranked_documents(
            query, filters, create_datastore(collection)
        )
        if not ranked_chunks:
            return yield_json_line(
                QAResponse(answer=None, quotes=None, ranked_documents=None)
            )

        top_docs = [
            SearchDoc(
                semantic_name=chunk.semantic_identifier,
                link=chunk.source_links.get("0") if chunk.source_links else None,
                blurb=chunk.blurb,
                source_type=chunk.source_type,
            )
            for chunk in ranked_chunks
        ]
        top_docs_dict = {top_documents_key: [top_doc.json() for top_doc in top_docs]}
        yield yield_json_line(top_docs_dict)

        qa_model = get_default_backend_qa_model()
        for response_dict in qa_model.answer_question_stream(
            query, ranked_chunks[:NUM_RERANKED_RESULTS]
        ):
            logger.debug(response_dict)
            yield yield_json_line(response_dict)

    return StreamingResponse(stream_qa_portions(), media_type="application/json")


@router.get("/keyword-search", response_model=KeywordResponse)
def keyword_search(question: QAQuestion = Depends()):
    ts_client = TSClient.get_instance()
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
