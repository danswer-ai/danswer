from datetime import datetime
from typing import Any
from typing import Generic
from typing import Literal
from typing import Optional
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel
from pydantic.generics import GenericModel

from danswer.configs.app_configs import MASK_CREDENTIAL_PREFIX
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import MessageType
from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SearchFeedbackType
from danswer.connectors.models import InputType
from danswer.datastores.interfaces import IndexFilter
from danswer.db.models import ChannelConfig
from danswer.db.models import Connector
from danswer.db.models import Credential
from danswer.db.models import DeletionStatus
from danswer.db.models import DocumentSet as DocumentSetDBModel
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType
from danswer.server.utils import mask_credential_dict


DataT = TypeVar("DataT")


class StatusResponse(GenericModel, Generic[DataT]):
    success: bool
    message: Optional[str] = None
    data: Optional[DataT] = None


class DataRequest(BaseModel):
    data: str


class HelperResponse(BaseModel):
    values: dict[str, str]
    details: list[str] | None = None


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
    google_drive_delegated_user: str | None  # email of user to impersonate


class FileUploadResponse(BaseModel):
    file_paths: list[str]


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


class BoostDoc(BaseModel):
    document_id: str
    semantic_id: str
    link: str
    boost: int
    hidden: bool


class BoostUpdateRequest(BaseModel):
    document_id: str
    boost: int


class SearchDoc(BaseModel):
    document_id: str
    semantic_identifier: str
    link: str | None
    blurb: str
    source_type: str
    boost: int
    score: float | None
    # Matched sections in the doc. Uses Vespa syntax e.g. <hi>TEXT</hi>
    # to specify that a set of words should be highlighted. For example:
    # ["<hi>the</hi> <hi>answer</hi> is 42", "the answer is <hi>42</hi>""]
    match_highlights: list[str]


class CreateChatSessionID(BaseModel):
    chat_session_id: int


class QuestionRequest(BaseModel):
    query: str
    collection: str
    use_keyword: bool | None
    filters: list[IndexFilter] | None
    offset: int | None


class QAFeedbackRequest(BaseModel):
    query_id: int
    feedback: QAFeedbackType


class SearchFeedbackRequest(BaseModel):
    query_id: int
    document_id: str
    document_rank: int
    click: bool
    search_feedback: SearchFeedbackType


class CreateChatMessageRequest(BaseModel):
    chat_session_id: int
    message_number: int
    parent_edit_number: int | None
    message: str
    persona_id: int | None


class ChatMessageIdentifier(BaseModel):
    chat_session_id: int
    message_number: int
    edit_number: int


class RegenerateMessageRequest(ChatMessageIdentifier):
    persona_id: int | None


class ChatRenameRequest(BaseModel):
    chat_session_id: int
    name: str | None
    first_message: str | None


class RenameChatSessionResponse(BaseModel):
    new_name: str  # This is only really useful if the name is generated


class ChatSessionIdsResponse(BaseModel):
    sessions: list[int]


class ChatMessageDetail(BaseModel):
    message_number: int
    edit_number: int
    parent_edit_number: int | None
    latest: bool
    message: str
    message_type: MessageType
    time_sent: datetime


class ChatSessionDetailResponse(BaseModel):
    chat_session_id: int
    description: str
    messages: list[ChatMessageDetail]


class QueryValidationResponse(BaseModel):
    reasoning: str
    answerable: bool


class SearchResponse(BaseModel):
    # For semantic search, top docs are reranked, the remaining are as ordered from retrieval
    top_ranked_docs: list[SearchDoc] | None
    lower_ranked_docs: list[SearchDoc] | None
    query_event_id: int


class QAResponse(SearchResponse):
    answer: str | None  # DanswerAnswer
    quotes: list[DanswerQuote] | None
    predicted_flow: QueryFlow
    predicted_search: SearchType
    eval_res_valid: bool | None = None
    error_msg: str | None = None


class UserByEmail(BaseModel):
    user_email: str


class IndexAttemptRequest(BaseModel):
    input_type: InputType = InputType.POLL
    connector_specific_config: dict[str, Any]


class IndexAttemptSnapshot(BaseModel):
    status: IndexingStatus | None
    num_docs_indexed: int
    error_msg: str | None
    time_started: str | None
    time_updated: str

    @classmethod
    def from_index_attempt_db_model(
        cls, index_attempt: IndexAttempt
    ) -> "IndexAttemptSnapshot":
        return IndexAttemptSnapshot(
            status=index_attempt.status,
            num_docs_indexed=index_attempt.num_docs_indexed or 0,
            error_msg=index_attempt.error_msg,
            time_started=index_attempt.time_started.isoformat()
            if index_attempt.time_started
            else None,
            time_updated=index_attempt.time_updated.isoformat(),
        )


class DeletionAttemptSnapshot(BaseModel):
    connector_id: int
    credential_id: int
    status: DeletionStatus
    error_msg: str | None
    num_docs_deleted: int


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


class RunConnectorRequest(BaseModel):
    connector_id: int
    credential_ids: list[int] | None


class CredentialBase(BaseModel):
    credential_json: dict[str, Any]
    public_doc: bool


class CredentialSnapshot(CredentialBase):
    id: int
    user_id: UUID | None
    time_created: datetime
    time_updated: datetime

    @classmethod
    def from_credential_db_model(cls, credential: Credential) -> "CredentialSnapshot":
        return CredentialSnapshot(
            id=credential.id,
            credential_json=mask_credential_dict(credential.credential_json)
            if MASK_CREDENTIAL_PREFIX
            else credential.credential_json,
            user_id=credential.user_id,
            public_doc=credential.public_doc,
            time_created=credential.time_created,
            time_updated=credential.time_updated,
        )


class ConnectorIndexingStatus(BaseModel):
    """Represents the latest indexing status of a connector"""

    cc_pair_id: int
    name: str | None
    connector: ConnectorSnapshot
    credential: CredentialSnapshot
    owner: str
    public_doc: bool
    last_status: IndexingStatus | None
    last_success: datetime | None
    docs_indexed: int
    error_msg: str | None
    latest_index_attempt: IndexAttemptSnapshot | None
    deletion_attempt: DeletionAttemptSnapshot | None
    is_deletable: bool


class ConnectorCredentialPairIdentifier(BaseModel):
    connector_id: int
    credential_id: int


class ConnectorCredentialPairMetadata(BaseModel):
    name: str | None


class ConnectorCredentialPairDescriptor(BaseModel):
    id: int
    name: str | None
    connector: ConnectorSnapshot
    credential: CredentialSnapshot


class ApiKey(BaseModel):
    api_key: str


class DocumentSetCreationRequest(BaseModel):
    name: str
    description: str
    cc_pair_ids: list[int]


class DocumentSetUpdateRequest(BaseModel):
    id: int
    description: str
    cc_pair_ids: list[int]


class DocumentSet(BaseModel):
    id: int
    name: str
    description: str
    cc_pair_descriptors: list[ConnectorCredentialPairDescriptor]
    is_up_to_date: bool

    @classmethod
    def from_model(cls, document_set_model: DocumentSetDBModel) -> "DocumentSet":
        return cls(
            id=document_set_model.id,
            name=document_set_model.name,
            description=document_set_model.description,
            cc_pair_descriptors=[
                ConnectorCredentialPairDescriptor(
                    id=cc_pair.id,
                    name=cc_pair.name,
                    connector=ConnectorSnapshot.from_connector_db_model(
                        cc_pair.connector
                    ),
                    credential=CredentialSnapshot.from_credential_db_model(
                        cc_pair.credential
                    ),
                )
                for cc_pair in document_set_model.connector_credential_pairs
            ],
            is_up_to_date=document_set_model.is_up_to_date,
        )


class SlackBotTokens(BaseModel):
    bot_token: str
    app_token: str


class SlackBotConfigCreationRequest(BaseModel):
    # currently, a persona is created for each slack bot config
    # in the future, `document_sets` will probably be replaced
    # by an optional `PersonaSnapshot` object. Keeping it like this
    # for now for simplicity / speed of development
    document_sets: list[int]
    channel_names: list[str]
    answer_validity_check_enabled: bool


class SlackBotConfig(BaseModel):
    id: int
    # currently, a persona is created for each slack bot config
    # in the future, `document_sets` will probably be replaced
    # by an optional `PersonaSnapshot` object. Keeping it like this
    # for now for simplicity / speed of development
    document_sets: list[DocumentSet]
    channel_config: ChannelConfig
