import datetime
import json
from typing import Any
from typing import Literal
from typing import NotRequired  # type: ignore
from typing import Optional
from typing_extensions import TypedDict  # noreorder
from uuid import UUID

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseOAuthAccountTableUUID
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyBaseAccessTokenTableUUID
from fastapi_users_db_sqlalchemy.generics import TIMESTAMPAware
from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import func
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import Sequence
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.interfaces import Dialect
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from sqlalchemy.types import LargeBinary
from sqlalchemy.types import TypeDecorator

from enmedd.auth.schemas import UserRole
from enmedd.configs.chat_configs import NUM_POSTPROCESSED_RESULTS
from enmedd.configs.constants import DEFAULT_BOOST
from enmedd.configs.constants import DocumentSource
from enmedd.configs.constants import FileOrigin
from enmedd.configs.constants import MessageType
from enmedd.db.enums import AccessType
from enmedd.configs.constants import NotificationType
from enmedd.configs.constants import SearchFeedbackType
from enmedd.configs.constants import TokenRateLimitScope
from enmedd.connectors.models import InputType
from enmedd.db.enums import ChatSessionSharedStatus
from enmedd.db.enums import ConnectorCredentialPairStatus
from enmedd.db.enums import IndexingStatus
from enmedd.db.enums import IndexModelStatus
from enmedd.db.enums import InstanceSubscriptionPlan
from enmedd.db.enums import PageType
from enmedd.db.enums import TaskStatus
from enmedd.db.pydantic_type import PydanticType
from enmedd.key_value_store.interface import JSON_ro
from enmedd.file_store.models import FileDescriptor
from enmedd.llm.override_models import LLMOverride
from enmedd.llm.override_models import PromptOverride
from enmedd.search.enums import RecencyBiasSetting
from enmedd.utils.encryption import decrypt_bytes_to_string
from enmedd.utils.encryption import encrypt_string_to_bytes
from shared_configs.enums import EmbeddingProvider
from shared_configs.enums import RerankerProvider


class Base(DeclarativeBase):
    __abstract__ = True


class EncryptedString(TypeDecorator):
    impl = LargeBinary

    def process_bind_param(self, value: str | None, dialect: Dialect) -> bytes | None:
        if value is not None:
            return encrypt_string_to_bytes(value)
        return value

    def process_result_value(self, value: bytes | None, dialect: Dialect) -> str | None:
        if value is not None:
            return decrypt_bytes_to_string(value)
        return value


class EncryptedJson(TypeDecorator):
    impl = LargeBinary

    def process_bind_param(self, value: dict | None, dialect: Dialect) -> bytes | None:
        if value is not None:
            json_str = json.dumps(value)
            return encrypt_string_to_bytes(json_str)
        return value

    def process_result_value(
        self, value: bytes | None, dialect: Dialect
    ) -> dict | None:
        if value is not None:
            json_str = decrypt_bytes_to_string(value)
            return json.loads(json_str)
        return value


"""
Auth/Authz (users, permissions, access) Tables
"""


class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    # even an almost empty token from keycloak will not fit the default 1024 bytes
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # type: ignore


class User(SQLAlchemyBaseUserTableUUID, Base):
    full_name: Mapped[str] = mapped_column(Text, nullable=True)
    company_name: Mapped[str] = mapped_column(Text, nullable=True)
    company_email: Mapped[str] = mapped_column(String, nullable=True)
    company_billing: Mapped[str] = mapped_column(Text, nullable=True)
    billing_email_address: Mapped[str] = mapped_column(String, nullable=True)
    profile: Mapped[str] = mapped_column(String, nullable=True)
    vat: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    oauth_accounts: Mapped[list[OAuthAccount]] = relationship(
        "OAuthAccount", lazy="joined", cascade="all, delete-orphan"
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, default=UserRole.BASIC)
    )

    """
    Preferences probably should be in a separate table at some point, but for now
    putting here for simpicity
    """

    # if specified, controls the assistants that are shown to the user + their order
    # if not specified, all assistants are shown
    chosen_assistants: Mapped[list[int]] = mapped_column(
        postgresql.JSONB(), nullable=False, default=[-2, -1, 0]
    )
    visible_assistants: Mapped[list[int]] = mapped_column(
        postgresql.JSONB(), nullable=False, default=[]
    )
    hidden_assistants: Mapped[list[int]] = mapped_column(
        postgresql.JSONB(), nullable=False, default=[]
    )

    oidc_expiry: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMPAware(timezone=True), nullable=True
    )

    default_model: Mapped[str] = mapped_column(Text, nullable=True)
    # organized in typical structured fashion
    # formatted as `displayName__provider__modelName`

    # relationships
    credentials: Mapped[list["Credential"]] = relationship(
        "Credential", back_populates="user", lazy="joined"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="user"
    )
    chat_folders: Mapped[list["ChatFolder"]] = relationship(
        "ChatFolder", back_populates="user"
    )

    prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="user")
    # Assistants owned by this user
    assistants: Mapped[list["Assistant"]] = relationship(
        "Assistant", back_populates="user"
    )
    input_prompts: Mapped[list["InputPrompt"]] = relationship(
        "InputPrompt", back_populates="user"
    )
    # Custom tools created by this user
    custom_tools: Mapped[list["Tool"]] = relationship("Tool", back_populates="user")
    # Notifications for the UI
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user"
    )
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace", secondary="user__teamspace", back_populates="users", lazy="joined"
    )
    workspace: Mapped[list["Workspace"]] = relationship(
        "Workspace", secondary="workspace__users", back_populates="users", lazy="joined"
    )
    teamspace = relationship("Teamspace", back_populates="users")


class InputPrompt(Base):
    __tablename__ = "inputprompt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    prompt: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean)
    user: Mapped[User | None] = relationship("User", back_populates="input_prompts")
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )


class InputPrompt__User(Base):
    __tablename__ = "inputprompt__user"

    input_prompt_id: Mapped[int] = mapped_column(
        ForeignKey("inputprompt.id"), primary_key=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inputprompt.id", ondelete="CASCADE"), primary_key=True
    )


class AccessToken(SQLAlchemyBaseAccessTokenTableUUID, Base):
    pass


class TwofactorAuth(Base):
    __tablename__ = "two_factor_auth"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String, unique=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ApiKey(Base):
    __tablename__ = "api_key"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    hashed_api_key: Mapped[str] = mapped_column(String, unique=True)
    api_key_display: Mapped[str] = mapped_column(String, unique=True)
    # the ID of the "user" who represents the access credentials for the API key
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    # the ID of the user who owns the key
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Add this relationship to access the User object via user_id
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[int] = mapped_column(primary_key=True)
    notif_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False)
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_shown: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    first_shown: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship("User", back_populates="notifications")


"""
Association Tables
NOTE: must be at the top since they are referenced by other tables
"""


class Assistant__DocumentSet(Base):
    __tablename__ = "assistant__document_set"

    assistant_id: Mapped[int] = mapped_column(
        ForeignKey("assistant.id"), primary_key=True
    )
    document_set_id: Mapped[int] = mapped_column(
        ForeignKey("document_set.id"), primary_key=True
    )


class Assistant__Prompt(Base):
    __tablename__ = "assistant__prompt"

    assistant_id: Mapped[int] = mapped_column(
        ForeignKey("assistant.id"), primary_key=True
    )
    prompt_id: Mapped[int] = mapped_column(ForeignKey("prompt.id"), primary_key=True)


class Assistant__User(Base):
    __tablename__ = "assistant__user"

    assistant_id: Mapped[int] = mapped_column(
        ForeignKey("assistant.id"), primary_key=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, nullable=True
    )


class DocumentSet__User(Base):
    __tablename__ = "document_set__user"

    document_set_id: Mapped[int] = mapped_column(
        ForeignKey("document_set.id"), primary_key=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, nullable=True
    )


class DocumentSet__ConnectorCredentialPair(Base):
    __tablename__ = "document_set__connector_credential_pair"

    document_set_id: Mapped[int] = mapped_column(
        ForeignKey("document_set.id"), primary_key=True
    )
    connector_credential_pair_id: Mapped[int] = mapped_column(
        ForeignKey("connector_credential_pair.id"), primary_key=True
    )
    # if `True`, then is part of the current state of the document set
    # if `False`, then is a part of the prior state of the document set
    # rows with `is_current=False` should be deleted when the document
    # set is updated and should not exist for a given document set if
    # `DocumentSet.is_up_to_date == True`
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        primary_key=True,
    )

    document_set: Mapped["DocumentSet"] = relationship("DocumentSet")


class ChatMessage__SearchDoc(Base):
    __tablename__ = "chat_message__search_doc"

    chat_message_id: Mapped[int] = mapped_column(
        ForeignKey("chat_message.id"), primary_key=True
    )
    search_doc_id: Mapped[int] = mapped_column(
        ForeignKey("search_doc.id"), primary_key=True
    )


class Document__Tag(Base):
    __tablename__ = "document__tag"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("document.id"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.id"), primary_key=True)


class Assistant__Tool(Base):
    __tablename__ = "assistant__tool"

    assistant_id: Mapped[int] = mapped_column(
        ForeignKey("assistant.id"), primary_key=True
    )
    tool_id: Mapped[int] = mapped_column(ForeignKey("tool.id"), primary_key=True)


class Workspace__Users(Base):
    __tablename__ = "workspace__users"

    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspace.id"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )


class Workspace__Teamspace(Base):
    __tablename__ = "workspace__teamspace"

    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspace.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class ChatSession__Teamspace(Base):
    __tablename__ = "chat_session__teamspace"

    chat_session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_session.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class ChatFolder__Teamspace(Base):
    __tablename__ = "chat_folder__teamspace"

    chat_folder_id: Mapped[int] = mapped_column(
        ForeignKey("chat_folder.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class Tool__Teamspace(Base):
    __tablename__ = "tool__teamspace"

    tool_id: Mapped[int] = mapped_column(ForeignKey("tool.id"), primary_key=True)
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class StandardAnswer__StandardAnswerCategory(Base):
    __tablename__ = "standard_answer__standard_answer_category"

    standard_answer_id: Mapped[int] = mapped_column(
        ForeignKey("standard_answer.id"), primary_key=True
    )
    standard_answer_category_id: Mapped[int] = mapped_column(
        ForeignKey("standard_answer_category.id"), primary_key=True
    )


class ChatMessage__StandardAnswer(Base):
    __tablename__ = "chat_message__standard_answer"

    chat_message_id: Mapped[int] = mapped_column(
        ForeignKey("chat_message.id"), primary_key=True
    )
    standard_answer_id: Mapped[int] = mapped_column(
        ForeignKey("standard_answer.id"), primary_key=True
    )


"""
Documents/Indexing Tables
"""


class ConnectorCredentialPair(Base):
    """Connectors and Credentials can have a many-to-many relationship
    I.e. A Confluence Connector may have multiple admin users who can run it with their own credentials
    I.e. An admin user may use the same credential to index multiple Confluence Spaces
    """

    __tablename__ = "connector_credential_pair"
    # NOTE: this `id` column has to use `Sequence` instead of `autoincrement=True`
    # due to some SQLAlchemy quirks + this not being a primary key column
    id: Mapped[int] = mapped_column(
        Integer,
        Sequence("connector_credential_pair_id_seq"),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[ConnectorCredentialPairStatus] = mapped_column(
        Enum(ConnectorCredentialPairStatus, native_enum=False), nullable=False
    )
    connector_id: Mapped[int] = mapped_column(
        ForeignKey("connector.id"), primary_key=True
    )

    deletion_failure_message: Mapped[str | None] = mapped_column(String, nullable=True)

    credential_id: Mapped[int] = mapped_column(
        ForeignKey("credential.id"), primary_key=True
    )
    # controls whether the documents indexed by this CC pair are visible to all
    # or if they are only visible to those with that are given explicit access
    # (e.g. via owning the credential or being a part of a group that is given access)
    access_type: Mapped[AccessType] = mapped_column(
        Enum(AccessType, native_enum=False), nullable=False
    )

    # special info needed for the auto-sync feature. The exact structure depends on the

    # source type (defined in the connector's `source` field)
    # E.g. for google_drive perm sync:
    # {"customer_id": "123567", "company_domain": "@enmedd.ai"}
    auto_sync_options: Mapped[dict[str, Any] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    last_time_perm_sync: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Time finished, not used for calculating backend jobs which uses time started (created)
    last_successful_index_time: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    total_docs_indexed: Mapped[int] = mapped_column(Integer, default=0)

    connector: Mapped["Connector"] = relationship(
        "Connector", back_populates="credentials"
    )
    credential: Mapped["Credential"] = relationship(
        "Credential", back_populates="connectors"
    )
    document_sets: Mapped[list["DocumentSet"]] = relationship(
        "DocumentSet",
        secondary=DocumentSet__ConnectorCredentialPair.__table__,
        primaryjoin=(
            (DocumentSet__ConnectorCredentialPair.connector_credential_pair_id == id)
            & (DocumentSet__ConnectorCredentialPair.is_current.is_(True))
        ),
        back_populates="connector_credential_pairs",
        overlaps="document_set",
    )
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="teamspace__connector_credential_pair",
        viewonly=True,
    )
    index_attempts: Mapped[list["IndexAttempt"]] = relationship(
        "IndexAttempt", back_populates="connector_credential_pair"
    )


class Document(Base):
    __tablename__ = "document"
    # NOTE: if more sensitive data is added here for display, make sure to add user/group permission

    # this should correspond to the ID of the document
    # (as is passed around in enMedD AI)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    from_ingestion_api: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=True
    )
    # 0 for neutral, positive for mostly endorse, negative for mostly reject
    boost: Mapped[int] = mapped_column(Integer, default=DEFAULT_BOOST)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    semantic_id: Mapped[str] = mapped_column(String)
    # First Section's link
    link: Mapped[str | None] = mapped_column(String, nullable=True)

    # The updated time is also used as a measure of the last successful state of the doc
    # pulled from the source (to help skip reindexing already updated docs in case of
    # connector retries)
    # TODO: rename this column because it conflates the time of the source doc
    # with the local last modified time of the doc and any associated metadata
    # it should just be the server timestamp of the source doc
    doc_updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # last time any vespa relevant row metadata or the doc changed.
    # does not include last_synced
    last_modified: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True, default=func.now()
    )

    # last successful sync to vespa
    last_synced: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    # The following are not attached to User because the account/email may not be known
    # within enMedD AI
    # Something like the document creator
    primary_owners: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    secondary_owners: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    # Permission sync columns
    # Email addresses are saved at the document level for externally synced permissions
    # This is becuase the normal flow of assigning permissions is through the cc_pair
    # doesn't apply here
    external_user_emails: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    # These group ids have been prefixed by the source type
    external_teamspace_ids: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    retrieval_feedbacks: Mapped[list["DocumentRetrievalFeedback"]] = relationship(
        "DocumentRetrievalFeedback", back_populates="document"
    )
    tags = relationship(
        "Tag",
        secondary=Document__Tag.__table__,
        back_populates="documents",
    )


class Tag(Base):
    __tablename__ = "tag"

    id: Mapped[int] = mapped_column(primary_key=True)
    tag_key: Mapped[str] = mapped_column(String)
    tag_value: Mapped[str] = mapped_column(String)
    source: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False)
    )

    documents = relationship(
        "Document",
        secondary=Document__Tag.__table__,
        back_populates="tags",
    )

    __table_args__ = (
        UniqueConstraint(
            "tag_key", "tag_value", "source", name="_tag_key_value_source_uc"
        ),
    )


class Connector(Base):
    __tablename__ = "connector"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    source: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False)
    )
    input_type = mapped_column(Enum(InputType, native_enum=False))
    connector_specific_config: Mapped[dict[str, Any]] = mapped_column(
        postgresql.JSONB()
    )
    indexing_start: Mapped[datetime.datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    refresh_freq: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prune_freq: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    credentials: Mapped[list["ConnectorCredentialPair"]] = relationship(
        "ConnectorCredentialPair",
        back_populates="connector",
        cascade="all, delete-orphan",
    )
    documents_by_connector: Mapped[
        list["DocumentByConnectorCredentialPair"]
    ] = relationship("DocumentByConnectorCredentialPair", back_populates="connector")


class Credential(Base):
    __tablename__ = "credential"

    name: Mapped[str] = mapped_column(String, nullable=True)

    source: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False)
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    credential_json: Mapped[dict[str, Any]] = mapped_column(EncryptedJson())
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    # if `true`, then all Admins will have access to the credential
    admin_public: Mapped[bool] = mapped_column(Boolean, default=True)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    connectors: Mapped[list["ConnectorCredentialPair"]] = relationship(
        "ConnectorCredentialPair",
        back_populates="credential",
        cascade="all, delete-orphan",
    )
    documents_by_credential: Mapped[
        list["DocumentByConnectorCredentialPair"]
    ] = relationship("DocumentByConnectorCredentialPair", back_populates="credential")

    user: Mapped[User | None] = relationship("User", back_populates="credentials")


class SearchSettings(Base):
    __tablename__ = "search_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String)
    model_dim: Mapped[int] = mapped_column(Integer)
    normalize: Mapped[bool] = mapped_column(Boolean)
    query_prefix: Mapped[str | None] = mapped_column(String, nullable=True)
    passage_prefix: Mapped[str | None] = mapped_column(String, nullable=True)

    status: Mapped[IndexModelStatus] = mapped_column(
        Enum(IndexModelStatus, native_enum=False)
    )
    index_name: Mapped[str] = mapped_column(String)
    provider_type: Mapped[EmbeddingProvider | None] = mapped_column(
        ForeignKey("embedding_provider.provider_type"), nullable=True
    )

    # Mini and Large Chunks (large chunk also checks for model max context)
    multipass_indexing: Mapped[bool] = mapped_column(Boolean, default=True)

    multilingual_expansion: Mapped[list[str]] = mapped_column(
        postgresql.ARRAY(String), default=[]
    )

    # Reranking settings
    disable_rerank_for_streaming: Mapped[bool] = mapped_column(Boolean, default=False)
    rerank_model_name: Mapped[str | None] = mapped_column(String, nullable=True)
    rerank_provider_type: Mapped[RerankerProvider | None] = mapped_column(
        Enum(RerankerProvider, native_enum=False), nullable=True
    )
    rerank_api_key: Mapped[str | None] = mapped_column(String, nullable=True)
    rerank_api_url: Mapped[str | None] = mapped_column(String, nullable=True)

    num_rerank: Mapped[int] = mapped_column(Integer, default=NUM_POSTPROCESSED_RESULTS)

    cloud_provider: Mapped["CloudEmbeddingProvider"] = relationship(
        "CloudEmbeddingProvider",
        back_populates="search_settings",
        foreign_keys=[provider_type],
    )

    index_attempts: Mapped[list["IndexAttempt"]] = relationship(
        "IndexAttempt", back_populates="search_settings"
    )

    __table_args__ = (
        Index(
            "ix_embedding_model_present_unique",
            "status",
            unique=True,
            postgresql_where=(status == IndexModelStatus.PRESENT),
        ),
        Index(
            "ix_embedding_model_future_unique",
            "status",
            unique=True,
            postgresql_where=(status == IndexModelStatus.FUTURE),
        ),
    )

    def __repr__(self) -> str:
        return f"<EmbeddingModel(model_name='{self.model_name}', status='{self.status}',\
          cloud_provider='{self.cloud_provider.provider_type if self.cloud_provider else 'None'}')>"

    @property
    def api_version(self) -> str | None:
        return (
            self.cloud_provider.api_version if self.cloud_provider is not None else None
        )

    @property
    def deployment_name(self) -> str | None:
        return (
            self.cloud_provider.deployment_name
            if self.cloud_provider is not None
            else None
        )

    @property
    def api_url(self) -> str | None:
        return self.cloud_provider.api_url if self.cloud_provider is not None else None

    @property
    def api_key(self) -> str | None:
        return self.cloud_provider.api_key if self.cloud_provider is not None else None


class IndexAttempt(Base):
    """
    Represents an attempt to index a group of 1 or more documents from a
    source. For example, a single pull from Google Drive, a single event from
    slack event API, or a single website crawl.
    """

    __tablename__ = "index_attempt"

    id: Mapped[int] = mapped_column(primary_key=True)

    connector_credential_pair_id: Mapped[int] = mapped_column(
        ForeignKey("connector_credential_pair.id"),
        nullable=False,
    )

    # Some index attempts that run from beginning will still have this as False
    # This is only for attempts that are explicitly marked as from the start via
    # the run once API
    from_beginning: Mapped[bool] = mapped_column(Boolean)
    status: Mapped[IndexingStatus] = mapped_column(
        Enum(IndexingStatus, native_enum=False)
    )
    # The two below may be slightly out of sync if user switches Embedding Model
    new_docs_indexed: Mapped[int | None] = mapped_column(Integer, default=0)
    total_docs_indexed: Mapped[int | None] = mapped_column(Integer, default=0)
    docs_removed_from_index: Mapped[int | None] = mapped_column(Integer, default=0)
    # only filled if status = "failed"
    error_msg: Mapped[str | None] = mapped_column(Text, default=None)
    # only filled if status = "failed" AND an unhandled exception caused the failure
    full_exception_trace: Mapped[str | None] = mapped_column(Text, default=None)
    # Nullable because in the past, we didn't allow swapping out embedding models live
    search_settings_id: Mapped[int] = mapped_column(
        ForeignKey("search_settings.id"),
        nullable=False,
    )
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    # when the actual indexing run began
    # NOTE: will use the api_server clock rather than DB server clock
    time_started: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    connector_credential_pair: Mapped[ConnectorCredentialPair] = relationship(
        "ConnectorCredentialPair", back_populates="index_attempts"
    )

    search_settings: Mapped[SearchSettings] = relationship(
        "SearchSettings", back_populates="index_attempts"
    )

    error_rows = relationship(
        "IndexAttemptError",
        back_populates="index_attempt",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_index_attempt_latest_for_connector_credential_pair",
            "connector_credential_pair_id",
            "time_created",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<IndexAttempt(id={self.id!r}, "
            f"status={self.status!r}, "
            f"error_msg={self.error_msg!r})>"
            f"time_created={self.time_created!r}, "
            f"time_updated={self.time_updated!r}, "
        )

    def is_finished(self) -> bool:
        return self.status.is_terminal()


class IndexAttemptError(Base):
    """
    Represents an error that was encountered during an IndexAttempt.
    """

    __tablename__ = "index_attempt_errors"

    id: Mapped[int] = mapped_column(primary_key=True)

    index_attempt_id: Mapped[int] = mapped_column(
        ForeignKey("index_attempt.id"),
        nullable=True,
    )

    # The index of the batch where the error occurred (if looping thru batches)
    # Just informational.
    batch: Mapped[int | None] = mapped_column(Integer, default=None)
    doc_summaries: Mapped[list[Any]] = mapped_column(postgresql.JSONB())
    error_msg: Mapped[str | None] = mapped_column(Text, default=None)
    traceback: Mapped[str | None] = mapped_column(Text, default=None)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # This is the reverse side of the relationship
    index_attempt = relationship("IndexAttempt", back_populates="error_rows")

    __table_args__ = (
        Index(
            "index_attempt_id",
            "time_created",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<IndexAttempt(id={self.id!r}, "
            f"index_attempt_id={self.index_attempt_id!r}, "
            f"error_msg={self.error_msg!r})>"
            f"time_created={self.time_created!r}, "
        )


class DocumentByConnectorCredentialPair(Base):
    """Represents an indexing of a document by a specific connector / credential pair"""

    __tablename__ = "document_by_connector_credential_pair"

    id: Mapped[str] = mapped_column(ForeignKey("document.id"), primary_key=True)
    # TODO: transition this to use the ConnectorCredentialPair id directly
    connector_id: Mapped[int] = mapped_column(
        ForeignKey("connector.id"), primary_key=True
    )
    credential_id: Mapped[int] = mapped_column(
        ForeignKey("credential.id"), primary_key=True
    )

    connector: Mapped[Connector] = relationship(
        "Connector", back_populates="documents_by_connector"
    )
    credential: Mapped[Credential] = relationship(
        "Credential", back_populates="documents_by_credential"
    )


"""
Messages Tables
"""


class SearchDoc(Base):
    """Different from Document table. This one stores the state of a document from a retrieval.
    This allows chat sessions to be replayed with the searched docs

    Notably, this does not include the contents of the Document/Chunk, during inference if a stored
    SearchDoc is selected, an inference must be remade to retrieve the contents
    """

    __tablename__ = "search_doc"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[str] = mapped_column(String)
    chunk_ind: Mapped[int] = mapped_column(Integer)
    semantic_id: Mapped[str] = mapped_column(String)
    link: Mapped[str | None] = mapped_column(String, nullable=True)
    blurb: Mapped[str] = mapped_column(String)
    boost: Mapped[int] = mapped_column(Integer)
    source_type: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False)
    )
    hidden: Mapped[bool] = mapped_column(Boolean)
    doc_metadata: Mapped[dict[str, str | list[str]]] = mapped_column(postgresql.JSONB())
    score: Mapped[float] = mapped_column(Float)
    match_highlights: Mapped[list[str]] = mapped_column(postgresql.ARRAY(String))
    # This is for the document, not this row in the table
    updated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    primary_owners: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    secondary_owners: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    is_internet: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)

    is_relevant: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    relevance_explanation: Mapped[str | None] = mapped_column(String, nullable=True)

    chat_messages = relationship(
        "ChatMessage",
        secondary=ChatMessage__SearchDoc.__table__,
        back_populates="search_docs",
    )


class ToolCall(Base):
    """Represents a single tool call"""

    __tablename__ = "tool_call"

    id: Mapped[int] = mapped_column(primary_key=True)
    # not a FK because we want to be able to delete the tool without deleting
    # this entry
    tool_id: Mapped[int] = mapped_column(Integer())
    tool_name: Mapped[str] = mapped_column(String())
    tool_arguments: Mapped[dict[str, JSON_ro]] = mapped_column(postgresql.JSONB())
    tool_result: Mapped[JSON_ro] = mapped_column(postgresql.JSONB())

    message_id: Mapped[int] = mapped_column(ForeignKey("chat_message.id"))

    message: Mapped["ChatMessage"] = relationship(
        "ChatMessage", back_populates="tool_calls"
    )


class ChatSession(Base):
    __tablename__ = "chat_session"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    assistant_id: Mapped[int | None] = mapped_column(
        ForeignKey("assistant.id"), nullable=True
    )
    description: Mapped[str] = mapped_column(Text)
    # One-shot direct answering, currently the two types of chats are not mixed
    one_shot: Mapped[bool] = mapped_column(Boolean, default=False)
    # Only ever set to True if system is set to not hard-delete chats
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    # controls whether or not this conversation is viewable by others
    shared_status: Mapped[ChatSessionSharedStatus] = mapped_column(
        Enum(ChatSessionSharedStatus, native_enum=False),
        default=ChatSessionSharedStatus.PRIVATE,
    )
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_folder.id"), nullable=True
    )

    current_alternate_model: Mapped[str | None] = mapped_column(String, default=None)

    # the latest "overrides" specified by the user. These take precedence over
    # the attached assistant. However, overrides specified directly in the
    # `send-message` call will take precedence over these.
    # NOTE: currently only used by the chat seeding flow, will be used in the
    # future once we allow users to override default values via the Chat UI
    # itself
    llm_override: Mapped[LLMOverride | None] = mapped_column(
        PydanticType(LLMOverride), nullable=True
    )
    prompt_override: Mapped[PromptOverride | None] = mapped_column(
        PydanticType(PromptOverride), nullable=True
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    user: Mapped[User] = relationship("User", back_populates="chat_sessions")
    folder: Mapped["ChatFolder"] = relationship(
        "ChatFolder", back_populates="chat_sessions"
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="chat_session"
    )
    assistant: Mapped["Assistant"] = relationship("Assistant")
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary=ChatSession__Teamspace.__table__,
        viewonly=True,
    )


class ChatMessage(Base):
    """Note, the first message in a chain has no contents, it's a workaround to allow edits
    on the first message of a session, an empty root node basically

    Since every user message is followed by a LLM response, chat messages generally come in pairs.
    Keeping them as separate messages however for future Agentification extensions
    Fields will be largely duplicated in the pair.
    """

    __tablename__ = "chat_message"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_session_id: Mapped[int] = mapped_column(ForeignKey("chat_session.id"))

    alternate_assistant_id = mapped_column(
        Integer, ForeignKey("assistant.id"), nullable=True
    )

    overridden_model: Mapped[str | None] = mapped_column(String, nullable=True)
    parent_message: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latest_child_message: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text)
    rephrased_query: Mapped[str] = mapped_column(Text, nullable=True)
    # If None, then there is no answer generation, it's the special case of only
    # showing the user the retrieved docs
    prompt_id: Mapped[int | None] = mapped_column(ForeignKey("prompt.id"))
    # If prompt is None, then token_count is 0 as this message won't be passed into
    # the LLM's context (not included in the history of messages)
    token_count: Mapped[int] = mapped_column(Integer)
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType, native_enum=False)
    )
    # Maps the citation numbers to a SearchDoc id
    citations: Mapped[dict[int, int]] = mapped_column(postgresql.JSONB(), nullable=True)
    # files associated with this message (e.g. images uploaded by the user that the
    # user is asking a question of)
    files: Mapped[list[FileDescriptor] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    # Only applies for LLM
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    time_sent: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    chat_session: Mapped[ChatSession] = relationship("ChatSession")
    prompt: Mapped[Optional["Prompt"]] = relationship("Prompt")

    chat_message_feedbacks: Mapped[list["ChatMessageFeedback"]] = relationship(
        "ChatMessageFeedback",
        back_populates="chat_message",
    )

    document_feedbacks: Mapped[list["DocumentRetrievalFeedback"]] = relationship(
        "DocumentRetrievalFeedback",
        back_populates="chat_message",
    )
    search_docs: Mapped[list["SearchDoc"]] = relationship(
        "SearchDoc",
        secondary=ChatMessage__SearchDoc.__table__,
        back_populates="chat_messages",
    )
    # NOTE: Should always be attached to the `assistant` message.
    # represents the tool calls used to generate this message
    tool_calls: Mapped[list["ToolCall"]] = relationship(
        "ToolCall",
        back_populates="message",
    )
    standard_answers: Mapped[list["StandardAnswer"]] = relationship(
        "StandardAnswer",
        secondary=ChatMessage__StandardAnswer.__table__,
        back_populates="chat_messages",
    )


class ChatFolder(Base):
    """For organizing chat sessions"""

    __tablename__ = "chat_folder"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Only null if auth is off
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    display_priority: Mapped[int] = mapped_column(Integer, nullable=True, default=0)

    user: Mapped[User] = relationship("User", back_populates="chat_folders")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="folder"
    )
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary=ChatFolder__Teamspace.__table__,
        viewonly=True,
    )

    def __lt__(self, other: Any) -> bool:
        if not isinstance(other, ChatFolder):
            return NotImplemented
        if self.display_priority == other.display_priority:
            # Bigger ID (created later) show earlier
            return self.id > other.id
        return self.display_priority < other.display_priority


"""
Feedback, Logging, Metrics Tables
"""


class DocumentRetrievalFeedback(Base):
    __tablename__ = "document_retrieval_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_message_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_message.id", ondelete="SET NULL"), nullable=True
    )
    document_id: Mapped[str] = mapped_column(ForeignKey("document.id"))
    # How high up this document is in the results, 1 for first
    document_rank: Mapped[int] = mapped_column(Integer)
    clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback: Mapped[SearchFeedbackType | None] = mapped_column(
        Enum(SearchFeedbackType, native_enum=False), nullable=True
    )

    chat_message: Mapped[ChatMessage] = relationship(
        "ChatMessage",
        back_populates="document_feedbacks",
        foreign_keys=[chat_message_id],
    )
    document: Mapped[Document] = relationship(
        "Document", back_populates="retrieval_feedbacks"
    )


class ChatMessageFeedback(Base):
    __tablename__ = "chat_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chat_message_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_message.id", ondelete="SET NULL"), nullable=True
    )
    is_positive: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    required_followup: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    predefined_feedback: Mapped[str | None] = mapped_column(String, nullable=True)

    chat_message: Mapped[ChatMessage] = relationship(
        "ChatMessage",
        back_populates="chat_message_feedbacks",
        foreign_keys=[chat_message_id],
    )


class LLMProvider(Base):
    __tablename__ = "llm_provider"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    provider: Mapped[str] = mapped_column(String)
    api_key: Mapped[str | None] = mapped_column(EncryptedString(), nullable=True)
    api_base: Mapped[str | None] = mapped_column(String, nullable=True)
    api_version: Mapped[str | None] = mapped_column(String, nullable=True)
    # custom configs that should be passed to the LLM provider at inference time
    # (e.g. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, etc. for bedrock)
    custom_config: Mapped[dict[str, str] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    default_model_name: Mapped[str] = mapped_column(String)
    fast_default_model_name: Mapped[str | None] = mapped_column(String, nullable=True)

    # Models to actually disp;aly to users
    # If nulled out, we assume in the application logic we should present all
    display_model_names: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    # The LLMs that are available for this provider. Only required if not a default provider.
    # If a default provider, then the LLM options are pulled from the `options.py` file.
    # If needed, can be pulled out as a separate table in the future.
    model_names: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String), nullable=True
    )
    deployment_name: Mapped[str | None] = mapped_column(String, nullable=True)

    # should only be set for a single provider
    is_default_provider: Mapped[bool | None] = mapped_column(Boolean, unique=True)
    # EE only
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="llm_provider__teamspace",
        viewonly=True,
    )


class CloudEmbeddingProvider(Base):
    __tablename__ = "embedding_provider"

    provider_type: Mapped[EmbeddingProvider] = mapped_column(
        Enum(EmbeddingProvider), primary_key=True
    )
    api_url: Mapped[str | None] = mapped_column(String, nullable=True)
    api_key: Mapped[str | None] = mapped_column(EncryptedString())
    api_version: Mapped[str | None] = mapped_column(String, nullable=True)
    deployment_name: Mapped[str | None] = mapped_column(String, nullable=True)

    search_settings: Mapped[list["SearchSettings"]] = relationship(
        "SearchSettings",
        back_populates="cloud_provider",
        foreign_keys="SearchSettings.provider_type",
    )

    def __repr__(self) -> str:
        return f"<EmbeddingProvider(type='{self.provider_type}')>"


class DocumentSet(Base):
    __tablename__ = "document_set"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(String)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    # Whether changes to the document set have been propagated
    is_up_to_date: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # If `False`, then the document set is not visible to users who are not explicitly
    # given access to it either via the `users` or `groups` relationships
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    connector_credential_pairs: Mapped[list[ConnectorCredentialPair]] = relationship(
        "ConnectorCredentialPair",
        secondary=DocumentSet__ConnectorCredentialPair.__table__,
        primaryjoin=(
            (DocumentSet__ConnectorCredentialPair.document_set_id == id)
            & (DocumentSet__ConnectorCredentialPair.is_current.is_(True))
        ),
        secondaryjoin=(
            DocumentSet__ConnectorCredentialPair.connector_credential_pair_id
            == ConnectorCredentialPair.id
        ),
        back_populates="document_sets",
        overlaps="document_set",
    )
    assistants: Mapped[list["Assistant"]] = relationship(
        "Assistant",
        secondary=Assistant__DocumentSet.__table__,
        back_populates="document_sets",
    )
    # Other users with access
    users: Mapped[list[User]] = relationship(
        "User",
        secondary=DocumentSet__User.__table__,
        viewonly=True,
    )
    # EE only
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="document_set__teamspace",
        viewonly=True,
    )


class Prompt(Base):
    __tablename__ = "prompt"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    system_prompt: Mapped[str] = mapped_column(Text)
    task_prompt: Mapped[str] = mapped_column(Text)
    include_citations: Mapped[bool] = mapped_column(Boolean, default=True)
    datetime_aware: Mapped[bool] = mapped_column(Boolean, default=True)
    # Default prompts are configured via backend during deployment
    # Treated specially (cannot be user edited etc.)
    default_prompt: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship("User", back_populates="prompts")
    assistants: Mapped[list["Assistant"]] = relationship(
        "Assistant",
        secondary=Assistant__Prompt.__table__,
        back_populates="prompts",
    )


class Tool(Base):
    __tablename__ = "tool"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    # ID of the tool in the codebase, only applies for in-code tools.
    # tools defined via the UI will have this as None
    in_code_tool_id: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str] = mapped_column(String, nullable=True)

    # OpenAPI scheme for the tool. Only applies to tools defined via the UI.
    openapi_schema: Mapped[dict[str, Any] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    custom_headers: Mapped[list[dict[str, str]] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    # user who created / owns the tool. Will be None for built-in tools.
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )

    user: Mapped[User | None] = relationship("User", back_populates="custom_tools")
    # Relationship to Assistant through the association table
    assistants: Mapped[list["Assistant"]] = relationship(
        "Assistant",
        secondary=Assistant__Tool.__table__,
        back_populates="tools",
    )
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="tool__teamspace",
        viewonly=True,
    )


class StarterMessage(TypedDict):
    """NOTE: is a `TypedDict` so it can be used as a type hint for a JSONB column
    in Postgres"""

    name: str
    description: str
    message: str


class Assistant(Base):
    __tablename__ = "assistant"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    # Number of chunks to pass to the LLM for generation.
    num_chunks: Mapped[float | None] = mapped_column(Float, nullable=True)
    chunks_above: Mapped[int] = mapped_column(Integer)
    chunks_below: Mapped[int] = mapped_column(Integer)
    # Pass every chunk through LLM for evaluation, fairly expensive
    # Can be turned off globally by admin, in which case, this setting is ignored
    llm_relevance_filter: Mapped[bool] = mapped_column(Boolean)
    # Enables using LLM to extract time and source type filters
    # Can also be admin disabled globally
    llm_filter_extraction: Mapped[bool] = mapped_column(Boolean)
    recency_bias: Mapped[RecencyBiasSetting] = mapped_column(
        Enum(RecencyBiasSetting, native_enum=False)
    )
    # Allows the Assistant to specify a different LLM version than is controlled
    # globablly via env variables. For flexibility, validity is not currently enforced
    # NOTE: only is applied on the actual response generation - is not used for things like
    # auto-detected time filters, relevance filters, etc.
    llm_model_provider_override: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    llm_model_version_override: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    starter_messages: Mapped[list[StarterMessage] | None] = mapped_column(
        postgresql.JSONB(), nullable=True
    )
    search_start_date: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    # Built-in assistants are configured via backend during deployment
    # Treated specially (cannot be user edited etc.)
    builtin_assistant: Mapped[bool] = mapped_column(Boolean, default=False)

    # Default assistants are assistants created by admins and are automatically added
    # to all users' assistants list.
    is_default_assistant: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    # controls whether the assistant is available to be selected by users
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    # controls the ordering of assistants in the UI
    # higher priority assistants are displayed first, ties are resolved by the ID,
    # where lower value IDs (e.g. created earlier) are displayed first
    display_priority: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None
    )
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    uploaded_image_id: Mapped[str | None] = mapped_column(String, nullable=True)
    icon_color: Mapped[str | None] = mapped_column(String, nullable=True)
    icon_shape: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # These are only defaults, users can select from all if desired
    prompts: Mapped[list[Prompt]] = relationship(
        "Prompt",
        secondary=Assistant__Prompt.__table__,
        back_populates="assistants",
    )
    # These are only defaults, users can select from all if desired
    document_sets: Mapped[list[DocumentSet]] = relationship(
        "DocumentSet",
        secondary=Assistant__DocumentSet.__table__,
        back_populates="assistants",
    )
    tools: Mapped[list[Tool]] = relationship(
        "Tool",
        secondary=Assistant__Tool.__table__,
        back_populates="assistants",
    )
    # Owner
    user: Mapped[User | None] = relationship("User", back_populates="assistants")
    # Other users with access
    users: Mapped[list[User]] = relationship(
        "User",
        secondary=Assistant__User.__table__,
        viewonly=True,
    )
    # EE only
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="assistant__teamspace",
        viewonly=True,
    )

    # Default assistants loaded via yaml cannot have the same name
    __table_args__ = (
        Index(
            "_builtin_assistant_name_idx",
            "name",
            unique=True,
            postgresql_where=(builtin_assistant == True),  # noqa: E712
        ),
    )


AllowedAnswerFilters = (
    Literal["well_answered_postfilter"] | Literal["questionmark_prefilter"]
)


class ChannelConfig(TypedDict):
    """NOTE: is a `TypedDict` so it can be used as a type hint for a JSONB column
    in Postgres"""

    channel_names: list[str]
    respond_tag_only: NotRequired[bool]  # defaults to False
    respond_to_bots: NotRequired[bool]  # defaults to False
    respond_member_group_list: NotRequired[list[str]]
    answer_filters: NotRequired[list[AllowedAnswerFilters]]
    # If None then no follow up
    # If empty list, follow up with no tags
    follow_up_tags: NotRequired[list[str]]


class TaskQueueState(Base):
    # Currently refers to Celery Tasks
    __tablename__ = "task_queue_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Celery task id. currently only for readability/diagnostics
    task_id: Mapped[str] = mapped_column(String)
    # For any job type, this would be the same
    task_name: Mapped[str] = mapped_column(String)
    # Note that if the task dies, this won't necessarily be marked FAILED correctly
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus, native_enum=False))
    start_time: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    register_time: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class KVStore(Base):
    __tablename__ = "key_value_store"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[JSON_ro] = mapped_column(postgresql.JSONB(), nullable=True)
    encrypted_value: Mapped[JSON_ro] = mapped_column(EncryptedJson(), nullable=True)


class PGFileStore(Base):
    __tablename__ = "file_store"

    file_name: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=True)
    file_origin: Mapped[FileOrigin] = mapped_column(Enum(FileOrigin, native_enum=False))
    file_type: Mapped[str] = mapped_column(String, default="text/plain")
    file_metadata: Mapped[JSON_ro] = mapped_column(postgresql.JSONB(), nullable=True)
    lobj_oid: Mapped[int] = mapped_column(Integer, nullable=False)


"""
************************************************************************
Enterprise Edition Models
************************************************************************

These models are only used in Enterprise Edition only features in enMedD AI.
They are kept here to simplify the codebase and avoid having different assumptions
on the shape of data being passed around between the MIT and EE versions of enMedD AI.

In the MIT version of enMedD AI, assume these tables are always empty.
"""


class SamlAccount(Base):
    __tablename__ = "saml"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), unique=True
    )
    encrypted_cookie: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User")


class User__Teamspace(Base):
    __tablename__ = "user__teamspace"

    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True, nullable=True
    )
    # TODO: modify this into either using our own approach or enmedd's approach
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, default=UserRole.BASIC)
    )


class Teamspace__ConnectorCredentialPair(Base):
    __tablename__ = "teamspace__connector_credential_pair"

    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )
    cc_pair_id: Mapped[int] = mapped_column(
        ForeignKey("connector_credential_pair.id"), primary_key=True
    )
    # if `True`, then is part of the current state of the Teamspace
    # if `False`, then is a part of the prior state of the Teamspace
    # rows with `is_current=False` should be deleted when the Teamspace
    # is updated and should not exist for a given Teamspace if
    # `Teamspace.is_up_to_date == True`
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        primary_key=True,
    )
    cc_pair: Mapped[ConnectorCredentialPair] = relationship(
        "ConnectorCredentialPair",
    )
    teamspace: Mapped["Teamspace"] = relationship("Teamspace", lazy="joined")


class Assistant__Teamspace(Base):
    __tablename__ = "assistant__teamspace"

    assistant_id: Mapped[int] = mapped_column(
        ForeignKey("assistant.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class LLMProvider__Teamspace(Base):
    __tablename__ = "llm_provider__teamspace"

    llm_provider_id: Mapped[int] = mapped_column(
        ForeignKey("llm_provider.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class DocumentSet__Teamspace(Base):
    __tablename__ = "document_set__teamspace"

    document_set_id: Mapped[int] = mapped_column(
        ForeignKey("document_set.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class Credential__Teamspace(Base):
    __tablename__ = "credential__teamspace"

    credential_id: Mapped[int] = mapped_column(
        ForeignKey("credential.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class Teamspace(Base):
    __tablename__ = "teamspace"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    creator_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    # whether or not changes to the Teamspace have been propagated to Vespa
    is_up_to_date: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # tell the sync job to clean up the group
    is_up_for_deletion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    logo: Mapped[str] = mapped_column(String, nullable=True)
    creator: Mapped[User] = relationship("User", back_populates="teamspace")
    users: Mapped[list[User]] = relationship(
        "User", secondary=User__Teamspace.__table__, viewonly=True
    )
    teamspace_relationships: Mapped[list[User__Teamspace]] = relationship(
        "User__Teamspace",
        viewonly=True,
    )
    cc_pairs: Mapped[list[ConnectorCredentialPair]] = relationship(
        "ConnectorCredentialPair",
        secondary=Teamspace__ConnectorCredentialPair.__table__,
        viewonly=True,
    )
    cc_pair_relationships: Mapped[
        list[Teamspace__ConnectorCredentialPair]
    ] = relationship(
        "Teamspace__ConnectorCredentialPair",
        viewonly=True,
    )
    assistants: Mapped[list[Assistant]] = relationship(
        "Assistant",
        secondary=Assistant__Teamspace.__table__,
        viewonly=True,
    )
    document_sets: Mapped[list[DocumentSet]] = relationship(
        "DocumentSet",
        secondary=DocumentSet__Teamspace.__table__,
        viewonly=True,
    )
    credentials: Mapped[list[Credential]] = relationship(
        "Credential",
        secondary=Credential__Teamspace.__table__,
    )

    workspace: Mapped[list["Workspace"]] = relationship(
        "Workspace",
        secondary="workspace__teamspace",
        viewonly=True,
    )

    tool: Mapped[list[Tool]] = relationship(
        "Tool",
        secondary="tool__teamspace",
        viewonly=True,
    )
    chat_sessions: Mapped[list[ChatSession]] = relationship(
        "ChatSession",
        secondary=ChatSession__Teamspace.__table__,
        viewonly=True,
    )
    token_rate_limit: Mapped["TokenRateLimit"] = relationship(
        "TokenRateLimit",
        secondary="token_rate_limit__teamspace",
        viewonly=True,
    )

    chat_folders: Mapped[list[ChatFolder]] = relationship(
        "ChatFolder",
        secondary=ChatFolder__Teamspace.__table__,
        viewonly=True,
    )
    credentials: Mapped[list[Credential]] = relationship(
        "Credential",
        secondary=Credential__Teamspace.__table__,
    )
    settings: Mapped["TeamspaceSettings"] = relationship(
        "TeamspaceSettings", back_populates="teamspace", viewonly=False
    )


"""Tables related to Token Rate Limiting
NOTE: `TokenRateLimit` is partially an MIT feature (global rate limit)
"""


class TokenRateLimit(Base):
    __tablename__ = "token_rate_limit"

    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    token_budget: Mapped[int] = mapped_column(Integer, nullable=False)
    period_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    scope: Mapped[TokenRateLimitScope] = mapped_column(
        Enum(TokenRateLimitScope, native_enum=False)
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    groups: Mapped["Teamspace"] = relationship(
        "Teamspace",
        secondary="token_rate_limit__teamspace",
        viewonly=True,
    )


class TokenRateLimit__Teamspace(Base):
    __tablename__ = "token_rate_limit__teamspace"

    rate_limit_id: Mapped[int] = mapped_column(
        ForeignKey("token_rate_limit.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


class StandardAnswerCategory(Base):
    __tablename__ = "standard_answer_category"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    standard_answers: Mapped[list["StandardAnswer"]] = relationship(
        "StandardAnswer",
        secondary=StandardAnswer__StandardAnswerCategory.__table__,
        back_populates="categories",
    )


class StandardAnswer(Base):
    __tablename__ = "standard_answer"

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword: Mapped[str] = mapped_column(String)
    answer: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean)
    match_regex: Mapped[bool] = mapped_column(Boolean)
    match_any_keywords: Mapped[bool] = mapped_column(Boolean)

    __table_args__ = (
        Index(
            "unique_keyword_active",
            keyword,
            active,
            unique=True,
            postgresql_where=(active == True),  # noqa: E712
        ),
    )

    categories: Mapped[list[StandardAnswerCategory]] = relationship(
        "StandardAnswerCategory",
        secondary=StandardAnswer__StandardAnswerCategory.__table__,
        back_populates="standard_answers",
    )
    chat_messages: Mapped[list[ChatMessage]] = relationship(
        "ChatMessage",
        secondary=ChatMessage__StandardAnswer.__table__,
        back_populates="standard_answers",
    )


"""Tables related to Permission Sync"""


class User__ExternalTeamspaceId(Base):
    """Maps user info both internal and external to the name of the external group
    This maps the user to all of their external groups so that the external group name can be
    attached to the ACL list matching during query time. User level permissions can be handled by
    directly adding the enMedD AI user to the doc ACL list"""

    __tablename__ = "user__external_teamspace_id"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    # These group ids have been prefixed by the source type
    external_teamspace_id: Mapped[str] = mapped_column(String, primary_key=True)
    cc_pair_id: Mapped[int] = mapped_column(ForeignKey("connector_credential_pair.id"))


class UsageReport(Base):
    """This stores metadata about usage reports generated by admin including user who generated
    them as well las the period they cover. The actual zip file of the report is stored as a lo
    using the PGFileStore
    """

    __tablename__ = "usage_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_name: Mapped[str] = mapped_column(ForeignKey("file_store.file_name"))

    # if None, report was auto-generated
    requestor_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=True
    )
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    period_from: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    period_to: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="usage_report__teamspace",
        viewonly=True,
    )
    requestor = relationship("User")
    file = relationship("PGFileStore")


class UsageReport__Teamspace(Base):
    """This maps usage reports to the Teamspace they were generated for"""

    __tablename__ = "usage_report__teamspace"

    report_id: Mapped[int] = mapped_column(
        ForeignKey("usage_reports.id"), primary_key=True
    )
    teamspace_id: Mapped[int] = mapped_column(
        ForeignKey("teamspace.id"), primary_key=True
    )


"""
Workspace Tables
"""


class Workspace(Base):
    __tablename__ = "workspace"

    id: Mapped[int] = mapped_column(primary_key=True)
    instance_id: Mapped[int | None] = mapped_column(
        ForeignKey("instance.id"), nullable=True
    )
    workspace_name: Mapped[str] = mapped_column(Text)
    workspace_description: Mapped[str] = mapped_column(Text, nullable=True)
    use_custom_logo: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_logo: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_header_logo: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_header_content: Mapped[str | None] = mapped_column(Text, nullable=True)

    users: Mapped[list[User]] = relationship(
        "User", secondary=Workspace__Users.__table__, viewonly=True
    )

    groups: Mapped[list["Teamspace"]] = relationship(
        "Teamspace",
        secondary="workspace__teamspace",
        back_populates="workspace",
        viewonly=True,
    )
    settings: Mapped["WorkspaceSettings"] = relationship(
        "WorkspaceSettings", back_populates="workspace", viewonly=False
    )
    instance: Mapped["Instance"] = relationship("Instance", back_populates="workspaces")


class Instance(Base):
    __tablename__ = "instance"

    id: Mapped[int] = mapped_column(primary_key=True)
    instance_name: Mapped[str] = mapped_column(Text)
    subscription_plan: Mapped[InstanceSubscriptionPlan | None] = mapped_column(
        Enum(InstanceSubscriptionPlan, native_enum=False),
        default=InstanceSubscriptionPlan.PARTNER,
    )
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)

    workspaces: Mapped[list[Workspace] | None] = relationship(
        "Workspace", back_populates="instance"
    )


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_page_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    search_page_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    default_page: Mapped[PageType] = mapped_column(
        Enum(PageType, native_enum=False), default=PageType.CHAT
    )
    maximum_chat_retention_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspace.id"), nullable=True
    )
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="settings"
    )
    num_indexing_workers: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    vespa_searcher_threads: Mapped[int] = mapped_column(
        Integer, nullable=False, default=2
    )


class TeamspaceSettings(Base):
    __tablename__ = "teamspace_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_page_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    search_page_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    chat_history_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    default_page: Mapped[PageType] = mapped_column(
        Enum(PageType, native_enum=False), default=PageType.CHAT
    )
    maximum_chat_retention_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    teamspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("teamspace.id"), nullable=True
    )
    teamspace: Mapped["Teamspace"] = relationship(
        "Teamspace", back_populates="settings"
    )
