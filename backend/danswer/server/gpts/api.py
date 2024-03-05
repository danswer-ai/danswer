import math
from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.engine import get_session
from danswer.document_index.factory import get_default_document_index
from danswer.search.access_filters import build_access_filters_for_user
from danswer.search.models import IndexFilters
from danswer.search.models import SearchQuery
from danswer.search.search_runner import full_chunk_search
from danswer.server.danswer_api.ingestion import api_key_dep
from danswer.utils.logger import setup_logger


logger = setup_logger()


router = APIRouter(prefix="/gpts")


def time_ago(dt: datetime) -> str:
    # Calculate time difference
    now = datetime.now()
    diff = now - dt

    # Convert difference to minutes
    minutes = diff.total_seconds() / 60

    # Determine the appropriate unit and calculate the age
    if minutes < 60:
        return f"~{math.floor(minutes)} minutes"
    hours = minutes / 60
    if hours < 24:
        return f"~{math.floor(hours)} hours"
    days = hours / 24
    if days < 7:
        return f"~{math.floor(days)} days"
    weeks = days / 7
    if weeks < 4:
        return f"~{math.floor(weeks)} weeks"
    months = days / 30
    return f"~{math.floor(months)} months"


class GptSearchRequest(BaseModel):
    query: str


class GptDocChunk(BaseModel):
    title: str
    content: str
    source_type: str
    link: str
    metadata: dict[str, str | list[str]]
    document_age: str


class GptSearchResponse(BaseModel):
    matching_document_chunks: list[GptDocChunk]


@router.post("/gpt-document-search")
def gpt_search(
    search_request: GptSearchRequest,
    _: str | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> GptSearchResponse:
    query = search_request.query

    user_acl_filters = build_access_filters_for_user(None, db_session)
    final_filters = IndexFilters(access_control_list=user_acl_filters)

    search_query = SearchQuery(
        query=query,
        filters=final_filters,
        recency_bias_multiplier=1.0,
        skip_llm_chunk_filter=True,
    )

    embedding_model = get_current_db_embedding_model(db_session)

    document_index = get_default_document_index(
        primary_index_name=embedding_model.index_name, secondary_index_name=None
    )

    top_chunks, __ = full_chunk_search(
        query=search_query, document_index=document_index, db_session=db_session
    )

    return GptSearchResponse(
        matching_document_chunks=[
            GptDocChunk(
                title=chunk.semantic_identifier,
                content=chunk.content,
                source_type=chunk.source_type,
                link=chunk.source_links.get(0, "") if chunk.source_links else "",
                metadata=chunk.metadata,
                document_age=time_ago(chunk.updated_at)
                if chunk.updated_at
                else "Unknown",
            )
            for chunk in top_chunks
        ],
    )
