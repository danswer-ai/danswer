from dataclasses import dataclass
from enum import Enum
from typing import Any

from danswer.configs.constants import DocumentSource
from pydantic import BaseModel


@dataclass
class Section:
    link: str
    text: str


@dataclass
class Document:
    id: str  # This must be unique or during indexing/reindexing, chunks will be overwritten
    sections: list[Section]
    source: DocumentSource
    semantic_identifier: str | None
    metadata: dict[str, Any] | None


def get_raw_document_text(document: Document) -> str:
    return "\n\n".join([section.text for section in document.sections])


class InputType(str, Enum):
    PULL = "pull"  # e.g. calling slack API to get all messages in the last hour
    LOAD_STATE = "load_state"  # e.g. loading the state of a slack workspace from a file
    EVENT = "event"  # e.g. registered an endpoint as a listener, and processing slack events


class ConnectorDescriptor(BaseModel):
    source: DocumentSource
    # how the raw data being indexed is procured
    input_type: InputType
    # what is passed into the __init__ of the connector described by `source`
    # and `input_type`
    connector_specific_config: dict[str, Any]

    class Config:
        arbitrary_types_allowed = True
