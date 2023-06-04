from datetime import datetime
from typing import Any
from typing import Generic
from typing import Literal
from typing import Optional
from typing import TYPE_CHECKING
from typing import TypeVar

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.datastores.interfaces import DatastoreFilter
from danswer.db.models import Connector
from danswer.db.models import IndexingStatus
from pydantic import BaseModel
from pydantic.generics import GenericModel


DataT = TypeVar("DataT")


class StatusResponse(GenericModel, Generic[DataT]):
    success: bool
    message: Optional[str] = None
    data: Optional[DataT] = None


class DataRequest(BaseModel):
    data: str


class GoogleAppWebCredentials(BaseModel):
    client_id: str
    project_id: str
    auth_uri: str
    token_uri: str
    auth_provider_x509_cert_url: str
    client_secret: str
    redirect_uris: list[str]
    javascript_origins: list[str]


class GoogleAppCredentials(BaseModel):
    web: GoogleAppWebCredentials


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
    refresh_freq: int | None  # In seconds, None for one time index with no refresh
    disabled: bool


class ConnectorSnapshot(ConnectorBase):
    id: int
    credential_ids: list[int]
    time_created: datetime
    time_updated: datetime

    @classmethod
    def from_connector_db_model(cls, connector: Connector) -> "ConnectorSnapshot":
        return ConnectorSnapshot(
            id=connector.id,
            name=connector.name,
            source=connector.source,
            input_type=connector.input_type,
            connector_specific_config=connector.connector_specific_config,
            refresh_freq=connector.refresh_freq,
            credential_ids=[
                association.credential.id for association in connector.credentials
            ],
            time_created=connector.time_created,
            time_updated=connector.time_updated,
            disabled=connector.disabled,
        )


class ConnectorIndexingStatus(BaseModel):
    """Represents the latest indexing status of a connector"""

    connector: ConnectorSnapshot
    owner: str
    public_doc: bool
    last_status: IndexingStatus
    last_success: datetime | None
    docs_indexed: int


class RunConnectorRequest(BaseModel):
    connector_id: int
    credential_ids: list[int] | None


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
