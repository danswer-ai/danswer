from dataclasses import dataclass
from typing import Any


@dataclass
class Section:
    link: str
    text: str


@dataclass
class Document:
    id: str
    sections: list[Section]
    metadata: dict[str, Any]


def get_raw_document_text(document: Document) -> str:
    return "\n\n".join([section.text for section in document.sections])
