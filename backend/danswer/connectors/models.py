from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel

from danswer.configs.constants import DocumentSource


class InputType(str, Enum):
    LOAD_STATE = "load_state"  # e.g. loading a current full state or a save state, such as from a file
    POLL = "poll"  # e.g. calling an API to get all documents in the last hour
    EVENT = "event"  # e.g. registered an endpoint as a listener, and processing connector events


class ConnectorMissingCredentialError(PermissionError):
    def __init__(self, connector_name: str) -> None:
        connector_name = connector_name or "Unknown"
        super().__init__(
            f"{connector_name} connector missing credentials, was load_credentials called?"
        )


class Section(BaseModel):
    link: str
    text: str


class DocumentBase(BaseModel):
    """Used for Danswer ingestion api, the ID is inferred before use if not provided"""

    id: str | None = None
    sections: list[Section]
    source: DocumentSource
    semantic_identifier: str  # displayed in the UI as the main identifier for the doc
    metadata: dict[str, Any]
    # UTC time
    doc_updated_at: datetime | None = None
    # Owner, creator, etc.
    primary_owners: list[str] | None = None
    # Assignee, space owner, etc.
    secondary_owners: list[str] | None = None
    # `title` is used when computing best matches for a query
    # if `None`, then we will use the `semantic_identifier` as the title in Vespa
    title: str | None = None
    from_ingestion_api: bool = False

    def get_title_for_document_index(self) -> str:
        return self.semantic_identifier if self.title is None else self.title


class Document(DocumentBase):
    id: str  # This must be unique or during indexing/reindexing, chunks will be overwritten

    def to_short_descriptor(self) -> str:
        """Used when logging the identity of a document"""
        return f"ID: '{self.id}'; Semantic ID: '{self.semantic_identifier}'"

    @classmethod
    def from_base(cls, base: DocumentBase) -> "Document":
        return cls(
            id=base.id or "ingestion_api_" + base.semantic_identifier,
            sections=base.sections,
            source=base.source,
            semantic_identifier=base.semantic_identifier,
            metadata=base.metadata,
            doc_updated_at=base.doc_updated_at,
            primary_owners=base.primary_owners,
            secondary_owners=base.secondary_owners,
            title=base.title,
        )


class IndexAttemptMetadata(BaseModel):
    connector_id: int
    credential_id: int
