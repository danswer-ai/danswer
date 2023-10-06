from dataclasses import dataclass
from enum import Enum
from typing import Any

from danswer.configs.constants import DocumentSource


class ConnectorMissingCredentialError(PermissionError):
    def __init__(self, connector_name: str) -> None:
        connector_name = connector_name or "Unknown"
        super().__init__(
            f"{connector_name} connector missing credentials, was load_credentials called?"
        )


@dataclass
class Section:
    link: str
    text: str


@dataclass
class Document:
    id: str  # This must be unique or during indexing/reindexing, chunks will be overwritten
    sections: list[Section]
    source: DocumentSource
    semantic_identifier: str
    metadata: dict[str, Any]

    def to_short_descriptor(self) -> str:
        """Used when logging the identity of a document"""
        return f"ID: '{self.id}'; Semantic ID: '{self.semantic_identifier}'"


class InputType(str, Enum):
    LOAD_STATE = "load_state"  # e.g. loading a current full state or a save state, such as from a file
    POLL = "poll"  # e.g. calling an API to get all documents in the last hour
    EVENT = "event"  # e.g. registered an endpoint as a listener, and processing connector events


@dataclass
class IndexAttemptMetadata:
    connector_id: int
    credential_id: int
