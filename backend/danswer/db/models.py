import datetime
from enum import Enum as PyEnum
from typing import Any
from typing import List
from typing import Optional
from uuid import UUID

from fastapi_users.db import SQLAlchemyBaseOAuthAccountTableUUID
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyBaseAccessTokenTableUUID
from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import func
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from danswer.auth.schemas import UserRole
from danswer.configs.constants import DEFAULT_BOOST
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import MessageType
from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SearchFeedbackType
from danswer.connectors.models import InputType
from danswer.search.models import SearchType


class IndexingStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


# these may differ in the future, which is why we're okay with this duplication
class DeletionStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


class Base(DeclarativeBase):
    pass


class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    # even an almost empty token from keycloak will not fit the default 1024 bytes
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # type: ignore


class User(SQLAlchemyBaseUserTableUUID, Base):
    oauth_accounts: Mapped[List[OAuthAccount]] = relationship(
        "OAuthAccount", lazy="joined"
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, default=UserRole.BASIC)
    )
    credentials: Mapped[List["Credential"]] = relationship(
        "Credential", back_populates="user", lazy="joined"
    )
    query_events: Mapped[List["QueryEvent"]] = relationship(
        "QueryEvent", back_populates="user"
    )
    chat_sessions: Mapped[List["ChatSession"]] = relationship(
        "ChatSession", back_populates="user"
    )


class AccessToken(SQLAlchemyBaseAccessTokenTableUUID, Base):
    pass


class ConnectorCredentialPair(Base):
    """Connectors and Credentials can have a many-to-many relationship
    I.e. A Confluence Connector may have multiple admin users who can run it with their own credentials
    I.e. An admin user may use the same credential to index multiple Confluence Spaces
    """

    __tablename__ = "connector_credential_pair"
    connector_id: Mapped[int] = mapped_column(
        ForeignKey("connector.id"), primary_key=True
    )
    credential_id: Mapped[int] = mapped_column(
        ForeignKey("credential.id"), primary_key=True
    )
    # Time finished, not used for calculating backend jobs which uses time started (created)
    last_successful_index_time: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    last_attempt_status: Mapped[IndexingStatus | None] = mapped_column(
        Enum(IndexingStatus)
    )
    total_docs_indexed: Mapped[int] = mapped_column(Integer, default=0)

    connector: Mapped["Connector"] = relationship(
        "Connector", back_populates="credentials"
    )
    credential: Mapped["Credential"] = relationship(
        "Credential", back_populates="connectors"
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
    refresh_freq: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)

    credentials: Mapped[List["ConnectorCredentialPair"]] = relationship(
        "ConnectorCredentialPair",
        back_populates="connector",
        cascade="all, delete-orphan",
    )
    documents_by_connector: Mapped[
        List["DocumentByConnectorCredentialPair"]
    ] = relationship("DocumentByConnectorCredentialPair", back_populates="connector")
    index_attempts: Mapped[List["IndexAttempt"]] = relationship(
        "IndexAttempt", back_populates="connector"
    )
    deletion_attempt: Mapped[Optional["DeletionAttempt"]] = relationship(
        "DeletionAttempt", back_populates="connector"
    )


class Credential(Base):
    __tablename__ = "credential"

    id: Mapped[int] = mapped_column(primary_key=True)
    credential_json: Mapped[dict[str, Any]] = mapped_column(postgresql.JSONB())
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    public_doc: Mapped[bool] = mapped_column(Boolean, default=False)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    connectors: Mapped[List["ConnectorCredentialPair"]] = relationship(
        "ConnectorCredentialPair",
        back_populates="credential",
        cascade="all, delete-orphan",
    )
    documents_by_credential: Mapped[
        List["DocumentByConnectorCredentialPair"]
    ] = relationship("DocumentByConnectorCredentialPair", back_populates="credential")
    index_attempts: Mapped[List["IndexAttempt"]] = relationship(
        "IndexAttempt", back_populates="credential"
    )
    deletion_attempt: Mapped[Optional["DeletionAttempt"]] = relationship(
        "DeletionAttempt", back_populates="credential"
    )
    user: Mapped[User | None] = relationship("User", back_populates="credentials")


class IndexAttempt(Base):
    """
    Represents an attempt to index a group of 1 or more documents from a
    source. For example, a single pull from Google Drive, a single event from
    slack event API, or a single website crawl.
    """

    __tablename__ = "index_attempt"

    id: Mapped[int] = mapped_column(primary_key=True)
    connector_id: Mapped[int | None] = mapped_column(
        ForeignKey("connector.id"),
        nullable=True,
    )
    credential_id: Mapped[int | None] = mapped_column(
        ForeignKey("credential.id"),
        nullable=True,
    )
    status: Mapped[IndexingStatus] = mapped_column(Enum(IndexingStatus))
    num_docs_indexed: Mapped[int | None] = mapped_column(Integer, default=0)
    error_msg: Mapped[str | None] = mapped_column(
        Text, default=None
    )  # only filled if status = "failed"
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

    connector: Mapped[Connector] = relationship(
        "Connector", back_populates="index_attempts"
    )
    credential: Mapped[Credential] = relationship(
        "Credential", back_populates="index_attempts"
    )

    __table_args__ = (
        Index(
            "ix_index_attempt_latest_for_connector_credential_pair",
            "connector_id",
            "credential_id",
            "time_created",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<IndexAttempt(id={self.id!r}, "
            f"connector_id={self.connector_id!r}, "
            f"status={self.status!r}, "
            f"error_msg={self.error_msg!r})>"
            f"time_created={self.time_created!r}, "
            f"time_updated={self.time_updated!r}, "
        )


class DeletionAttempt(Base):
    """Represents an attempt to delete all documents indexed by a specific
    connector / credential pair.
    """

    __tablename__ = "deletion_attempt"

    id: Mapped[int] = mapped_column(primary_key=True)
    connector_id: Mapped[int] = mapped_column(
        ForeignKey("connector.id"),
    )
    credential_id: Mapped[int] = mapped_column(
        ForeignKey("credential.id"),
    )
    status: Mapped[DeletionStatus] = mapped_column(Enum(DeletionStatus))
    num_docs_deleted: Mapped[int] = mapped_column(Integer, default=0)
    error_msg: Mapped[str | None] = mapped_column(
        Text, default=None
    )  # only filled if status = "failed"
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    connector: Mapped[Connector] = relationship(
        "Connector", back_populates="deletion_attempt"
    )
    credential: Mapped[Credential] = relationship(
        "Credential", back_populates="deletion_attempt"
    )


class DocumentByConnectorCredentialPair(Base):
    """Represents an indexing of a document by a specific connector / credential
    pair"""

    __tablename__ = "document_by_connector_credential_pair"

    id: Mapped[str] = mapped_column(ForeignKey("document.id"), primary_key=True)
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


class QueryEvent(Base):
    __tablename__ = "query_event"

    id: Mapped[int] = mapped_column(primary_key=True)
    query: Mapped[str] = mapped_column(Text)
    # search_flow refers to user selection, None if user used auto
    selected_search_flow: Mapped[SearchType | None] = mapped_column(
        Enum(SearchType), nullable=True
    )
    llm_answer: Mapped[str | None] = mapped_column(Text, default=None)
    feedback: Mapped[QAFeedbackType | None] = mapped_column(
        Enum(QAFeedbackType), nullable=True
    )
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped[User | None] = relationship("User", back_populates="query_events")
    document_feedbacks: Mapped[List["DocumentRetrievalFeedback"]] = relationship(
        "DocumentRetrievalFeedback", back_populates="qa_event"
    )


class DocumentRetrievalFeedback(Base):
    __tablename__ = "document_retrieval_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    qa_event_id: Mapped[int] = mapped_column(
        ForeignKey("query_event.id"),
    )
    document_id: Mapped[str] = mapped_column(
        ForeignKey("document.id"),
    )
    # How high up this document is in the results, 1 for first
    document_rank: Mapped[int] = mapped_column(Integer)
    clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback: Mapped[SearchFeedbackType | None] = mapped_column(
        Enum(SearchFeedbackType), nullable=True
    )

    qa_event: Mapped[QueryEvent] = relationship(
        "QueryEvent", back_populates="document_feedbacks"
    )
    document: Mapped["Document"] = relationship(
        "Document", back_populates="retrieval_feedbacks"
    )


class Document(Base):
    __tablename__ = "document"

    # this should correspond to the ID of the document
    # (as is passed around in Danswer)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    # 0 for neutral, positive for mostly endorse, negative for mostly reject
    boost: Mapped[int] = mapped_column(Integer, default=DEFAULT_BOOST)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    semantic_id: Mapped[str] = mapped_column(String)
    # First Section's link
    link: Mapped[str | None] = mapped_column(String, nullable=True)
    # TODO if more sensitive data is added here for display, make sure to add user/group permission

    retrieval_feedbacks: Mapped[List[DocumentRetrievalFeedback]] = relationship(
        "DocumentRetrievalFeedback", back_populates="document"
    )


class ChatSession(Base):
    __tablename__ = "chat_session"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="chat_session", cascade="delete"
    )


class ChatMessage(Base):
    __tablename__ = "chat_message"

    chat_session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_session.id"), primary_key=True
    )
    message_number: Mapped[int] = mapped_column(Integer, primary_key=True)
    edit_number: Mapped[int] = mapped_column(Integer, default=0, primary_key=True)
    parent_edit_number: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # null if first message
    latest: Mapped[bool] = mapped_column(Boolean, default=True)
    message: Mapped[str] = mapped_column(Text)
    message_type: Mapped[MessageType] = mapped_column(Enum(MessageType))
    time_sent: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    chat_session: Mapped[ChatSession] = relationship("ChatSession")
