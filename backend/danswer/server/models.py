from datetime import datetime
from typing import Any
from typing import Generic
from typing import Literal
from typing import Optional
from typing import TypeVar

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.datastores.interfaces import DatastoreFilter
from danswer.db.models import IndexingStatus
from pydantic import BaseModel
from pydantic.generics import GenericModel


DataT = TypeVar("DataT")


class StatusResponse(GenericModel, Generic[DataT]):
    success: bool
    message: Optional[str] = None
    data: Optional[DataT] = None


class HealthCheckResponse(BaseModel):
    status: Literal["ok"]


class ObjectCreationIdResponse(BaseModel):
    id: int | str


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


class ConnectorBase(BaseModel):
    name: str
    source: DocumentSource
    input_type: InputType
    connector_specific_config: dict[str, Any]
    refresh_freq: int  # In seconds
    disabled: bool


class ConnectorSnapshot(ConnectorBase):
    id: int
    credential_ids: list[int]
    time_created: datetime
    time_updated: datetime


class CredentialBase(BaseModel):
    credential_json: dict[str, Any]
    public_doc: bool


class CredentialSnapshot(CredentialBase):
    id: int
    user_id: int | None
    time_created: datetime
    time_updated: datetime


class IndexAttemptSnapshot(BaseModel):
    source: DocumentSource
    input_type: InputType
    status: IndexingStatus
    connector_specific_config: dict[str, Any]
    docs_indexed: int
    time_created: datetime
    time_updated: datetime


class ApiKey(BaseModel):
    api_key: str
