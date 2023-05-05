import datetime
from enum import Enum as PyEnum
from typing import Any

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from fastapi.encoders import jsonable_encoder
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import func
from sqlalchemy import String
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column


class Base(DeclarativeBase):
    pass


class IndexingStatus(str, PyEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


class IndexAttempt(Base):
    """
    Represents an attempt to index a group of 1 or more documents from a
    source. For example, a single pull from Google Drive, a single event from
    slack event API, or a single website crawl.
    """

    __tablename__ = "index_attempt"

    id: Mapped[int] = mapped_column(primary_key=True)
    # would like this to be a single JSONB column with structure described by
    # `ConnectorDescriptor`, but this is not easily supported and requires
    # some difficult to understand magic
    source: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False)
    )
    input_type: Mapped[InputType] = mapped_column(Enum(InputType, native_enum=False))
    connector_specific_config: Mapped[dict[str, Any]] = mapped_column(
        postgresql.JSONB(), nullable=False
    )
    # TODO (chris): potentially add metadata for the chunker, embedder, and datastore
    time_created: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    time_updated: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    status: Mapped[IndexingStatus] = mapped_column(Enum(IndexingStatus))
    document_ids: Mapped[list[str] | None] = mapped_column(
        postgresql.ARRAY(String()), default=None
    )  # only filled if status = "complete"
    error_msg: Mapped[str | None] = mapped_column(
        String(), default=None
    )  # only filled if status = "failed"

    def __repr__(self):
        return (
            f"<IndexAttempt(id={self.id!r}, "
            f"source={self.source!r}, "
            f"input_type={self.input_type!r}, "
            f"connector_specific_config={self.connector_specific_config!r}, "
            f"time_created={self.time_created!r}, "
            f"time_updated={self.time_updated!r}, "
            f"status={self.status!r}, "
            f"document_ids={self.document_ids!r}, "
            f"error_msg={self.error_msg!r})>"
        )
