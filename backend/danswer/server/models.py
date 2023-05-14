from datetime import datetime

from danswer.datastores.interfaces import DatastoreFilter
from danswer.db.models import IndexingStatus
from pydantic import BaseModel


class AuthStatus(BaseModel):
    authenticated: bool


class AuthUrl(BaseModel):
    auth_url: str


class GDriveCallback(BaseModel):
    state: str
    code: str


class UserRoleResponse(BaseModel):
    role: str


class SearchDoc(BaseModel):
    semantic_identifier: str
    link: str
    blurb: str
    source_type: str


class QAQuestion(BaseModel):
    query: str
    collection: str
    filters: list[DatastoreFilter] | None


class QAResponse(BaseModel):
    answer: str | None
    quotes: dict[str, dict[str, str | int | None]] | None
    ranked_documents: list[SearchDoc] | None


class KeywordResponse(BaseModel):
    results: list[str] | None


class UserByEmail(BaseModel):
    user_email: str


class WebIndexAttemptRequest(BaseModel):
    url: str


class IndexAttemptSnapshot(BaseModel):
    url: str
    status: IndexingStatus
    time_created: datetime
    time_updated: datetime
    docs_indexed: int


class ListWebsiteIndexAttemptsResponse(BaseModel):
    index_attempts: list[IndexAttemptSnapshot]
