from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from ee.enmedd.server.query_and_chat.models import DocumentSearchRequest
from enmedd.auth.users import current_user
from enmedd.db.engine import get_session
from enmedd.db.models import User
from enmedd.llm.factory import get_default_llms
from enmedd.search.models import SavedSearchDoc
from enmedd.search.models import SearchRequest
from enmedd.search.models import SearchResponse
from enmedd.search.pipeline import SearchPipeline
from enmedd.search.utils import chunks_or_sections_to_search_docs
from enmedd.search.utils import dedupe_documents
from enmedd.search.utils import drop_llm_indices
from enmedd.utils.logger import setup_logger


logger = setup_logger()
basic_router = APIRouter(prefix="/query")


@basic_router.post("/document-search")
def handle_search_request(
    search_request: DocumentSearchRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SearchResponse:
    """Simple search endpoint, does not create a new message or records in the DB"""
    query = search_request.message
    logger.info(f"Received document search query: {query}")

    llm, fast_llm = get_default_llms()
    search_pipeline = SearchPipeline(
        search_request=SearchRequest(
            query=query,
            search_type=search_request.search_type,
            human_selected_filters=search_request.retrieval_options.filters,
            enable_auto_detect_filters=search_request.retrieval_options.enable_auto_detect_filters,
            assistant=None,  # For simplicity, default settings should be good for this search
            offset=search_request.retrieval_options.offset,
            limit=search_request.retrieval_options.limit,
            skip_rerank=search_request.skip_rerank,
            skip_llm_chunk_filter=search_request.skip_llm_chunk_filter,
            chunks_above=search_request.chunks_above,
            chunks_below=search_request.chunks_below,
            full_doc=search_request.full_doc,
        ),
        user=user,
        llm=llm,
        fast_llm=fast_llm,
        db_session=db_session,
        bypass_acl=False,
    )
    top_sections = search_pipeline.reranked_sections
    # If using surrounding context or full doc, this will be empty
    relevant_chunk_indices = search_pipeline.relevant_chunk_indices
    top_docs = chunks_or_sections_to_search_docs(top_sections)

    # Deduping happens at the last step to avoid harming quality by dropping content early on
    deduped_docs = top_docs
    dropped_inds = None
    if search_request.retrieval_options.dedupe_docs:
        deduped_docs, dropped_inds = dedupe_documents(top_docs)

    # No need to save the docs for this API
    fake_saved_docs = [SavedSearchDoc.from_search_doc(doc) for doc in deduped_docs]

    if dropped_inds:
        relevant_chunk_indices = drop_llm_indices(
            llm_indices=relevant_chunk_indices,
            search_docs=fake_saved_docs,
            dropped_indices=dropped_inds,
        )

    return SearchResponse(
        top_documents=fake_saved_docs, llm_indices=relevant_chunk_indices
    )
