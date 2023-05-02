import time
from http import HTTPStatus

from danswer.configs.app_configs import DEFAULT_PROMPT
from danswer.configs.app_configs import KEYWORD_MAX_HITS
from danswer.configs.constants import CONTENT
from danswer.configs.constants import SOURCE_LINKS
from danswer.datastores import create_datastore
from danswer.datastores.interfaces import DatastoreFilter
from danswer.direct_qa.qa_prompts import BASIC_QA_PROMPTS
from danswer.direct_qa.question_answer import answer_question
from danswer.direct_qa.question_answer import process_answer
from danswer.direct_qa.semantic_search import semantic_search
from danswer.utils.clients import TSClient
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from pydantic import BaseModel


logger = setup_logger()

router = APIRouter()


class ServerStatus(BaseModel):
    status: str


class QAQuestion(BaseModel):
    query: str
    collection: str
    filters: list[DatastoreFilter] | None


class QAResponse(BaseModel):
    answer: str | None
    quotes: dict[str, dict[str, str]] | None


class KeywordResponse(BaseModel):
    results: list[str] | None


@router.get("/", response_model=ServerStatus)
@router.get("/status", response_model=ServerStatus)
def read_server_status():
    return {"status": HTTPStatus.OK.value}


@router.post("/direct-qa", response_model=QAResponse)
def direct_qa(question: QAQuestion):
    prompt_processor = BASIC_QA_PROMPTS[DEFAULT_PROMPT]
    query = question.query
    collection = question.collection
    filters = question.filters

    datastore = create_datastore(collection)

    logger.info(f"Received semantic query: {query}")

    start_time = time.time()
    ranked_chunks = semantic_search(query, filters, datastore)
    sem_search_time = time.time()

    logger.info(f"Semantic search took {sem_search_time - start_time} seconds")

    if not ranked_chunks:
        return {"answer": None, "quotes": None}

    top_docs = [ranked_chunk.document_id for ranked_chunk in ranked_chunks]
    top_contents = [ranked_chunk.content for ranked_chunk in ranked_chunks]

    files_log_msg = f"Top links from semantic search: {', '.join(top_docs)}"
    logger.info(files_log_msg)

    qa_answer = answer_question(query, top_contents, prompt_processor)
    qa_time = time.time()
    logger.debug(qa_answer)
    logger.info(f"GPT QA took {qa_time - sem_search_time} seconds")

    # Postprocessing, no more models involved, purely rule based
    answer, quotes_dict = process_answer(qa_answer, ranked_chunks)
    postprocess_time = time.time()
    logger.info(f"Postprocessing took {postprocess_time - qa_time} seconds")

    total_time = time.time() - start_time
    logger.info(f"Total QA took {total_time} seconds")

    qa_response = {"answer": answer, "quotes": quotes_dict}
    return qa_response


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

    return {"results": sources}
