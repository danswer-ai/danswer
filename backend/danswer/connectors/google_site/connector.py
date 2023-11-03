import os
import re
import urllib.parse
from typing import Any
from typing import cast

from bs4 import BeautifulSoup
from bs4 import Tag

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.file_utils import load_files_from_zip
from danswer.connectors.cross_connector_utils.file_utils import read_file
from danswer.connectors.cross_connector_utils.html_utils import web_html_cleanup
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


def process_link(element: BeautifulSoup | Tag) -> str:
    href = cast(str | None, element.get("href"))
    if not href:
        raise RuntimeError(f"Invalid link - {element}")

    # cleanup href
    href = urllib.parse.unquote(href)
    href = href.rstrip(".html").lower()
    href = href.replace("_", "")
    href = re.sub(
        r"([\s-]+)", "-", href
    )  # replace all whitespace/'-' groups with a single '-'

    return href


def find_google_sites_page_path_from_navbar(
    element: BeautifulSoup | Tag, path: str, is_initial: bool
) -> str | None:
    ul = cast(Tag | None, element.find("ul"))
    if ul:
        if not is_initial:
            a = cast(Tag, element.find("a"))
            new_path = f"{path}/{process_link(a)}"
            if a.get("aria-selected") == "true":
                return new_path
        else:
            new_path = ""
        for li in ul.find_all("li", recursive=False):
            found_link = find_google_sites_page_path_from_navbar(li, new_path, False)
            if found_link:
                return found_link
    else:
        a = cast(Tag, element.find("a"))
        if a:
            href = process_link(a)
            if href and a.get("aria-selected") == "true":
                return path + "/" + href

    return None


class GoogleSitesConnector(LoadConnector):
    def __init__(
        self,
        zip_path: str,
        base_url: str,
        batch_size: int = INDEX_BATCH_SIZE,
    ):
        self.zip_path = zip_path
        self.base_url = base_url
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        pass

    def load_from_state(self) -> GenerateDocumentsOutput:
        documents: list[Document] = []

        # load the HTML files
        files = load_files_from_zip(self.zip_path)
        for file_info, file_io in files:
            # skip non-published files
            if "/PUBLISHED/" not in file_info.filename:
                continue

            file_path, extension = os.path.splitext(file_info.filename)
            if extension != ".html":
                continue

            file_content, _ = read_file(file_io)
            soup = BeautifulSoup(file_content, "html.parser")

            # get the link out of the navbar
            header = cast(Tag, soup.find("header"))
            nav = cast(Tag, header.find("nav"))
            path = find_google_sites_page_path_from_navbar(nav, "", True)
            if not path:
                logger.error(
                    f"Could not find path for '{file_info.filename}'. "
                    + "This page will not have a working link."
                )

            # cleanup the hidden `Skip to main content` and `Skip to navigation` that
            # appears at the top of every page
            for div in soup.find_all("div", attrs={"data-is-touch-wrapper": "true"}):
                div.extract()

            # get the body of the page
            parsed_html = web_html_cleanup(
                soup, additional_element_types_to_discard=["header", "nav"]
            )

            title = parsed_html.title or file_path.split("/")[-1]
            documents.append(
                Document(
                    id=f"{DocumentSource.GOOGLE_SITES.value}:{path}",
                    source=DocumentSource.GOOGLE_SITES,
                    semantic_identifier=title,
                    sections=[
                        Section(
                            link=(self.base_url.rstrip("/") + "/" + path.lstrip("/"))
                            if path
                            else "",
                            text=parsed_html.cleaned_text,
                        )
                    ],
                    metadata={},
                )
            )

            if len(documents) >= self.batch_size:
                yield documents
                documents = []

        if documents:
            yield documents


if __name__ == "__main__":
    connector = GoogleSitesConnector(
        os.environ["GOOGLE_SITES_ZIP_PATH"],
        os.environ.get("GOOGLE_SITES_BASE_URL", ""),
    )
    for doc_batch in connector.load_from_state():
        for doc in doc_batch:
            print(doc)
