from dataclasses import dataclass
from typing import Any

from danswer.configs.constants import DocumentSource


@dataclass
class Section:
    link: str
    text: str


@dataclass
class Document:
    id: str  # This must be unique or during indexing/reindexing, chunks will be overwritten
    sections: list[Section]
    source: DocumentSource
    metadata: dict[str, Any]


def get_raw_document_text(document: Document) -> str:
    return "\n\n".join([section.text for section in document.sections])
