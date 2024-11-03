from typing import Any

from danswer.connectors.google_drive.resources import GoogleDocsService
from danswer.connectors.models import Section


def _build_gdoc_section_link(doc_id: str, heading_text: str) -> str:
    """Builds a Google Doc link that jumps to a specific heading"""
    return f"https://docs.google.com/document/d/{doc_id}/edit#heading={heading_text.replace(' ', '+')}"


def _extract_text_from_paragraph(paragraph: dict[str, Any]) -> str:
    """Extracts the text content from a paragraph element"""
    text_elements = []
    for element in paragraph.get("elements", []):
        if "textRun" in element:
            text_elements.append(element["textRun"].get("content", ""))
    return "".join(text_elements)


def get_document_sections(
    docs_service: GoogleDocsService,
    doc_id: str,
) -> list[Section]:
    """Extracts sections from a Google Doc, including their headings and content"""
    # Fetch the document structure
    doc = docs_service.documents().get(documentId=doc_id).execute()

    # Get the content
    content = doc.get("body", {}).get("content", [])

    sections: list[Section] = []
    current_section: list[str] = []
    current_heading: dict[str, Any] | None = None

    for element in content:
        if "paragraph" not in element:
            continue

        paragraph = element["paragraph"]

        # Check if this is a heading
        if (
            "paragraphStyle" in paragraph
            and "namedStyleType" in paragraph["paragraphStyle"]
        ):
            style = paragraph["paragraphStyle"]["namedStyleType"]
            is_heading = style.startswith("HEADING_")
            is_title = style.startswith("TITLE")

            if is_heading or is_title:
                # If we were building a previous section, add it to sections list
                if current_heading is not None and current_section:
                    heading_text = current_heading["text"]
                    section_text = f"{heading_text}\n" + "\n".join(current_section)
                    sections.append(
                        Section(
                            text=section_text,
                            link=_build_gdoc_section_link(doc_id, heading_text),
                        )
                    )
                    current_section = []

                # Start new heading
                heading_level = int(style.replace("HEADING_", "")) if is_heading else 0
                heading_text = _extract_text_from_paragraph(paragraph)
                current_heading = {"text": heading_text, "level": heading_level}
                continue

        # Add content to current section
        if current_heading is not None:
            text = _extract_text_from_paragraph(paragraph)
            if text.strip():
                current_section.append(text)

    # Don't forget to add the last section
    if current_heading is not None and current_section:
        section_text = f"{current_heading['text']}\n\n" + "\n".join(current_section)
        sections.append(
            Section(
                text=section_text,
                link=_build_gdoc_section_link(doc_id, current_heading["text"]),
            )
        )

    return sections