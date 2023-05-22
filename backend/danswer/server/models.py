from datetime import datetime
from typing import Any
from typing import Literal

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.datastores.interfaces import DatastoreFilter
from danswer.db.models import IndexingStatus
from pydantic import BaseModel


class HealthCheckResponse(BaseModel):
    status: Literal["ok"]


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
    link: str | None
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


class IndexAttemptRequest(BaseModel):
    input_type: InputType = InputType.POLL
    connector_specific_config: dict[str, Any]


class ConnectorSnapshot(BaseModel):
    id: int
    name: str
    source: DocumentSource
    input_type: InputType
    connector_specific_config: dict[str, Any]
    refresh_freq: int
    time_created: datetime
    time_updated: datetime
    disabled: bool


class CredentialSnapshot(BaseModel):
    id: int
    credentials: dict[str, Any]
    user_id: int
    time_created: datetime
    time_updated: datetime


class IndexAttemptSnapshot(BaseModel):
    connector_specific_config: dict[str, Any]
    status: IndexingStatus
    source: DocumentSource
    time_created: datetime
    time_updated: datetime
    docs_indexed: int


class ListIndexAttemptsResponse(BaseModel):
    index_attempts: list[IndexAttemptSnapshot]


class ApiKey(BaseModel):
    api_key: str
