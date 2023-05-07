import time
from http import HTTPStatus

from danswer.auth.schemas import UserRole
from danswer.auth.users import current_active_user
from danswer.configs.app_configs import KEYWORD_MAX_HITS
from danswer.configs.constants import CONTENT
from danswer.configs.constants import SOURCE_LINKS
from danswer.datastores import create_datastore
from danswer.db.engine import build_async_engine
from danswer.db.models import User
from danswer.direct_qa import get_default_backend_qa_model
from danswer.direct_qa.semantic_search import semantic_search
from danswer.server.models import KeywordResponse
from danswer.server.models import QAQuestion
from danswer.server.models import QAResponse
from danswer.server.models import ServerStatus
from danswer.server.models import UserByEmail
from danswer.utils.clients import TSClient
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

logger = setup_logger()

router = APIRouter()


# TODO delete this useless endpoint once frontend is integrated with auth
@router.get("/test-auth")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.role}!"}


# TODO DAN-39 delete this once oauth is built out and tested
@router.api_route("/test", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_endpoint(request: Request):
    print(request)


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


@router.post("/direct-qa", response_model=QAResponse)
def direct_qa(question: QAQuestion):
    start_time = time.time()
    qa_model = get_default_backend_qa_model()
    query = question.query
    collection = question.collection
    filters = question.filters

    datastore = create_datastore(collection)

    logger.info(f"Received semantic query: {query}")

    ranked_chunks = semantic_search(query, filters, datastore)
    if not ranked_chunks:
        return {"answer": None, "quotes": None}

    answer, quotes = qa_model.answer_question(query, ranked_chunks)
    logger.info(f"Total QA took {time.time() - start_time} seconds")

    return QAResponse(answer=answer, quotes=quotes)


@router.post("/keyword-search", response_model=KeywordResponse)
def keyword_search(question: QAQuestion):
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
