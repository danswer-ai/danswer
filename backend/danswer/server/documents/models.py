from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from danswer.configs.app_configs import MASK_CREDENTIAL_PREFIX
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import DocumentErrorSummary
from danswer.connectors.models import InputType
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.models import Connector
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import Credential
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexAttemptError as DbIndexAttemptError
from danswer.db.models import IndexingStatus
from danswer.db.models import TaskStatus
from danswer.server.utils import mask_credential_dict


class DocumentInfo(BaseModel):
    num_chunks: int
    num_tokens: int


class ChunkInfo(BaseModel):
    content: str
    num_tokens: int


class DeletionAttemptSnapshot(BaseModel):
    connector_id: int
    credential_id: int
    status: TaskStatus


class ConnectorBase(BaseModel):
    name: str
    source: DocumentSource
    input_type: InputType
    connector_specific_config: dict[str, Any]
    refresh_freq: int | None = (
        None  # In seconds, None for one time index with no refresh
    )
    prune_freq: int | None = None
    indexing_start: datetime | None = None


class ConnectorUpdateRequest(ConnectorBase):
    is_public: bool | None = None
    groups: list[int] | None = None


class ConnectorSnapshot(ConnectorBase):
    id: int
    credential_ids: list[int]
    time_created: datetime
    time_updated: datetime
    source: DocumentSource

    @classmethod
    def from_connector_db_model(cls, connector: Connector) -> "ConnectorSnapshot":
        return ConnectorSnapshot(
            id=connector.id,
            name=connector.name,
            source=connector.source,
            input_type=connector.input_type,
            connector_specific_config=connector.connector_specific_config,
            refresh_freq=connector.refresh_freq,
            prune_freq=connector.prune_freq,
            credential_ids=[
                association.credential.id for association in connector.credentials
            ],
            indexing_start=connector.indexing_start,
            time_created=connector.time_created,
            time_updated=connector.time_updated,
        )


class CredentialSwapRequest(BaseModel):
    new_credential_id: int
    connector_id: int


class CredentialDataUpdateRequest(BaseModel):
    name: str
    credential_json: dict[str, Any]


class CredentialBase(BaseModel):
    credential_json: dict[str, Any]
    # if `true`, then all Admins will have access to the credential
    admin_public: bool
    source: DocumentSource
    name: str | None = None
    curator_public: bool = False
    groups: list[int] = []


class CredentialSnapshot(CredentialBase):
    id: int
    user_id: UUID | None = None
    time_created: datetime
    time_updated: datetime
    name: str | None
    source: DocumentSource
    credential_json: dict[str, Any]
    admin_public: bool
    curator_public: bool

    @classmethod
    def from_credential_db_model(cls, credential: Credential) -> "CredentialSnapshot":
        return CredentialSnapshot(
            id=credential.id,
            credential_json=(
                mask_credential_dict(credential.credential_json)
                if MASK_CREDENTIAL_PREFIX and credential.credential_json
                else credential.credential_json
            ),
            user_id=credential.user_id,
            admin_public=credential.admin_public,
            time_created=credential.time_created,
            time_updated=credential.time_updated,
            source=credential.source or DocumentSource.NOT_APPLICABLE,
            name=credential.name,
            curator_public=credential.curator_public,
        )


class IndexAttemptSnapshot(BaseModel):
    id: int
    status: IndexingStatus | None = None
    new_docs_indexed: int  # only includes completely new docs
    total_docs_indexed: int  # includes docs that are updated
    docs_removed_from_index: int
    error_msg: str | None = None
    error_count: int
    full_exception_trace: str | None = None
    time_started: str | None = None
    time_updated: str

    @classmethod
    def from_index_attempt_db_model(
        cls, index_attempt: IndexAttempt
    ) -> "IndexAttemptSnapshot":
        return IndexAttemptSnapshot(
            id=index_attempt.id,
            status=index_attempt.status,
            new_docs_indexed=index_attempt.new_docs_indexed or 0,
            total_docs_indexed=index_attempt.total_docs_indexed or 0,
            docs_removed_from_index=index_attempt.docs_removed_from_index or 0,
            error_msg=index_attempt.error_msg,
            error_count=len(index_attempt.error_rows),
            full_exception_trace=index_attempt.full_exception_trace,
            time_started=(
                index_attempt.time_started.isoformat()
                if index_attempt.time_started
                else None
            ),
            time_updated=index_attempt.time_updated.isoformat(),
        )


class IndexAttemptError(BaseModel):
    id: int
    index_attempt_id: int | None = None
    batch_number: int | None = None
    doc_summaries: list[DocumentErrorSummary]
    error_msg: str | None = None
    traceback: str | None = None
    time_created: str

    @classmethod
    def from_db_model(cls, error: DbIndexAttemptError) -> "IndexAttemptError":
        doc_summaries = [
            DocumentErrorSummary.from_dict(summary) for summary in error.doc_summaries
        ]
        return IndexAttemptError(
            id=error.id,
            index_attempt_id=error.index_attempt_id,
            batch_number=error.batch,
            doc_summaries=doc_summaries,
            error_msg=error.error_msg,
            traceback=error.traceback,
            time_created=error.time_created.isoformat(),
        )


class CCPairFullInfo(BaseModel):
    id: int
    name: str
    status: ConnectorCredentialPairStatus
    num_docs_indexed: int
    connector: ConnectorSnapshot
    credential: CredentialSnapshot
    index_attempts: list[IndexAttemptSnapshot]
    latest_deletion_attempt: DeletionAttemptSnapshot | None = None
    is_public: bool
    is_editable_for_current_user: bool

    @classmethod
    def from_models(
        cls,
        cc_pair_model: ConnectorCredentialPair,
        index_attempt_models: list[IndexAttempt],
        latest_deletion_attempt: DeletionAttemptSnapshot | None,
        num_docs_indexed: int,  # not ideal, but this must be computed separately
        is_editable_for_current_user: bool,
    ) -> "CCPairFullInfo":
        return cls(
            id=cc_pair_model.id,
            name=cc_pair_model.name,
            status=cc_pair_model.status,
            num_docs_indexed=num_docs_indexed,
            connector=ConnectorSnapshot.from_connector_db_model(
                cc_pair_model.connector
            ),
            credential=CredentialSnapshot.from_credential_db_model(
                cc_pair_model.credential
            ),
            index_attempts=[
                IndexAttemptSnapshot.from_index_attempt_db_model(index_attempt_model)
                for index_attempt_model in index_attempt_models
            ],
            latest_deletion_attempt=latest_deletion_attempt,
            is_public=cc_pair_model.is_public,
            is_editable_for_current_user=is_editable_for_current_user,
        )


class ConnectorIndexingStatus(BaseModel):
    """Represents the latest indexing status of a connector"""

    cc_pair_id: int
    name: str | None = None
    cc_pair_status: ConnectorCredentialPairStatus
    connector: ConnectorSnapshot
    credential: CredentialSnapshot
    owner: str
    public_doc: bool
    last_finished_status: IndexingStatus | None = None
    last_status: IndexingStatus | None = None
    last_success: datetime | None = None
    docs_indexed: int
    error_msg: str | None = None
    latest_index_attempt: IndexAttemptSnapshot | None = None
    deletion_attempt: DeletionAttemptSnapshot | None = None
    is_deletable: bool


class ConnectorCredentialPairIdentifier(BaseModel):
    connector_id: int
    credential_id: int


class ConnectorCredentialPairMetadata(BaseModel):
    name: str | None = None
    is_public: bool
    groups: list[int] | None


class ConnectorCredentialPairDescriptor(BaseModel):
    id: int
    name: str | None = None
    connector: ConnectorSnapshot
    credential: CredentialSnapshot


class RunConnectorRequest(BaseModel):
    connector_id: int
    credential_ids: list[int] | None = None
    from_beginning: bool = False


"""Connectors Models"""


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


class GoogleServiceAccountKey(BaseModel):
    type: str
    project_id: str
    private_key_id: str
    private_key: str
    client_email: str
    client_id: str
    auth_uri: str
    token_uri: str
    auth_provider_x509_cert_url: str
    client_x509_cert_url: str
    universe_domain: str


class GoogleServiceAccountCredentialRequest(BaseModel):
    google_drive_delegated_user: str | None = None  # email of user to impersonate
    gmail_delegated_user: str | None = None  # email of user to impersonate


class FileUploadResponse(BaseModel):
    file_paths: list[str]


class ObjectCreationIdResponse(BaseModel):
    id: int | str
    credential: CredentialSnapshot | None = None


class AuthStatus(BaseModel):
    authenticated: bool


class AuthUrl(BaseModel):
    auth_url: str


class GmailCallback(BaseModel):
    state: str
    code: str


class GDriveCallback(BaseModel):
    state: str
    code: str
