from copy import copy
from dataclasses import dataclass

from bs4 import BeautifulSoup

from danswer.configs.app_configs import WEB_CONNECTOR_IGNORED_CLASSES
from danswer.configs.app_configs import WEB_CONNECTOR_IGNORED_ELEMENTS
from danswer.utils.text_processing import format_document_soup

MINTLIFY_UNWANTED = ["sticky", "hidden"]


@dataclass
class ParsedHTML:
    title: str | None
    cleaned_text: str


def standard_html_cleanup(
    page_content: str | BeautifulSoup,
    mintlify_cleanup_enabled: bool = True,
    additional_element_types_to_discard: list[str] | None = None,
) -> ParsedHTML:
    if isinstance(page_content, str):
        soup = BeautifulSoup(page_content, "html.parser")
    else:
        soup = page_content

    title_tag = soup.find("title")
    title = None
    if title_tag and title_tag.text:
        title = title_tag.text
        title_tag.extract()

    # Heuristics based cleaning of elements based on css classes
    unwanted_classes = copy(WEB_CONNECTOR_IGNORED_CLASSES)
    if mintlify_cleanup_enabled:
        unwanted_classes.extend(MINTLIFY_UNWANTED)
    for undesired_element in unwanted_classes:
        [
            tag.extract()
            for tag in soup.find_all(
                class_=lambda x: x and undesired_element in x.split()
            )
        ]

    for undesired_tag in WEB_CONNECTOR_IGNORED_ELEMENTS:
        [tag.extract() for tag in soup.find_all(undesired_tag)]

    if additional_element_types_to_discard:
        for undesired_tag in additional_element_types_to_discard:
            [tag.extract() for tag in soup.find_all(undesired_tag)]

    # 200B is ZeroWidthSpace which we don't care for
    page_text = format_document_soup(soup).replace("\u200B", "")

    return ParsedHTML(title=title, cleaned_text=page_text)
