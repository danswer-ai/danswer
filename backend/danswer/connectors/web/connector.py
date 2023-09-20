import io
from copy import copy
from datetime import datetime
from enum import Enum
from typing import Any
from typing import cast
from typing import Tuple
from urllib.parse import urljoin
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from oauthlib.oauth2 import BackendApplicationClient
from playwright.sync_api import BrowserContext
from playwright.sync_api import Playwright
from playwright.sync_api import sync_playwright
from PyPDF2 import PdfReader
from requests_oauthlib import OAuth2Session  # type:ignore

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.app_configs import WEB_CONNECTOR_IGNORED_CLASSES
from danswer.configs.app_configs import WEB_CONNECTOR_IGNORED_ELEMENTS
from danswer.configs.app_configs import WEB_CONNECTOR_OAUTH_CLIENT_ID
from danswer.configs.app_configs import WEB_CONNECTOR_OAUTH_CLIENT_SECRET
from danswer.configs.app_configs import WEB_CONNECTOR_OAUTH_TOKEN_URL
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import format_document_soup

logger = setup_logger()


MINTLIFY_UNWANTED = ["sticky", "hidden"]


class WEB_CONNECTOR_VALID_SETTINGS(str, Enum):
    # Given a base site, index everything under that path
    RECURSIVE = "recursive"
    # Given a URL, index only the given page
    SINGLE = "single"
    # Given a sitemap.xml URL, parse all the pages in it
    SITEMAP = "sitemap"
    # Given a file upload where every line is a URL, parse all the URLs provided
    UPLOAD = "upload"


def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False


def get_internal_links(
    base_url: str, url: str, soup: BeautifulSoup, should_ignore_pound: bool = True
) -> set[str]:
    internal_links = set()
    for link in cast(list[dict[str, Any]], soup.find_all("a")):
        href = cast(str | None, link.get("href"))
        if not href:
            continue

        if should_ignore_pound and "#" in href:
            href = href.split("#")[0]

        if not is_valid_url(href):
            # Relative path handling
            href = urljoin(url, href)

        if urlparse(href).netloc == urlparse(url).netloc and base_url in href:
            internal_links.add(href)
    return internal_links


def start_playwright() -> Tuple[Playwright, BrowserContext]:
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(headless=True)

    context = browser.new_context()

    if (
        WEB_CONNECTOR_OAUTH_CLIENT_ID
        and WEB_CONNECTOR_OAUTH_CLIENT_SECRET
        and WEB_CONNECTOR_OAUTH_TOKEN_URL
    ):
        client = BackendApplicationClient(client_id=WEB_CONNECTOR_OAUTH_CLIENT_ID)
        oauth = OAuth2Session(client=client)
        token = oauth.fetch_token(
            token_url=WEB_CONNECTOR_OAUTH_TOKEN_URL,
            client_id=WEB_CONNECTOR_OAUTH_CLIENT_ID,
            client_secret=WEB_CONNECTOR_OAUTH_CLIENT_SECRET,
        )
        context.set_extra_http_headers(
            {"Authorization": "Bearer {}".format(token["access_token"])}
        )

    return playwright, context


def extract_urls_from_sitemap(sitemap_url: str) -> list[str]:
    response = requests.get(sitemap_url)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    urls = [loc_tag.text for loc_tag in soup.find_all("loc")]

    return urls


def _ensure_valid_url(url: str) -> str:
    if "://" not in url:
        return "https://" + url
    return url


def _read_urls_file(location: str) -> list[str]:
    with open(location, "r") as f:
        urls = [_ensure_valid_url(line.strip()) for line in f if line.strip()]
    return urls


class WebConnector(LoadConnector):
    def __init__(
        self,
        base_url: str,  # Can't change this without disrupting existing users
        web_connector_type: str = WEB_CONNECTOR_VALID_SETTINGS.RECURSIVE.value,
        mintlify_cleanup: bool = True,  # Mostly ok to apply to other websites as well
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.mintlify_cleanup = mintlify_cleanup
        self.batch_size = batch_size
        self.recursive = False

        if web_connector_type == WEB_CONNECTOR_VALID_SETTINGS.RECURSIVE.value:
            self.recursive = True
            self.to_visit_list = [_ensure_valid_url(base_url)]
            return

        elif web_connector_type == WEB_CONNECTOR_VALID_SETTINGS.SINGLE.value:
            self.to_visit_list = [_ensure_valid_url(base_url)]

        elif web_connector_type == WEB_CONNECTOR_VALID_SETTINGS.SITEMAP:
            self.to_visit_list = extract_urls_from_sitemap(_ensure_valid_url(base_url))

        elif web_connector_type == WEB_CONNECTOR_VALID_SETTINGS.UPLOAD:
            self.to_visit_list = _read_urls_file(base_url)

        else:
            raise ValueError(
                "Invalid Web Connector Config, must choose a valid type between: " ""
            )

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        if credentials:
            logger.warning("Unexpected credentials provided for Web Connector")
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        """Traverses through all pages found on the website
        and converts them into documents"""
        visited_links: set[str] = set()
        to_visit: list[str] = self.to_visit_list
        base_url = to_visit[0]  # For the recursive case
        doc_batch: list[Document] = []

        playwright, context = start_playwright()
        restart_playwright = False
        while to_visit:
            current_url = to_visit.pop()
            if current_url in visited_links:
                continue
            visited_links.add(current_url)

            logger.info(f"Visiting {current_url}")

            try:
                current_visit_time = datetime.now().strftime("%B %d, %Y, %H:%M:%S")

                if restart_playwright:
                    playwright, context = start_playwright()
                    restart_playwright = False

                if current_url.split(".")[-1] == "pdf":
                    # PDF files are not checked for links
                    response = requests.get(current_url)
                    pdf_reader = PdfReader(io.BytesIO(response.content))
                    page_text = ""
                    for pdf_page in pdf_reader.pages:
                        page_text += pdf_page.extract_text()

                    doc_batch.append(
                        Document(
                            id=current_url,
                            sections=[Section(link=current_url, text=page_text)],
                            source=DocumentSource.WEB,
                            semantic_identifier=current_url.split(".")[-1],
                            metadata={"Time Visited": current_visit_time},
                        )
                    )
                    continue

                page = context.new_page()
                page.goto(current_url)
                final_page = page.url
                if final_page != current_url:
                    logger.info(f"Redirected to {final_page}")
                    current_url = final_page
                    if current_url in visited_links:
                        logger.info("Redirected page already indexed")
                        continue
                    visited_links.add(current_url)

                content = page.content()
                soup = BeautifulSoup(content, "html.parser")

                if self.recursive:
                    internal_links = get_internal_links(base_url, current_url, soup)
                    for link in internal_links:
                        if link not in visited_links:
                            to_visit.append(link)

                title_tag = soup.find("title")
                title = None
                if title_tag and title_tag.text:
                    title = title_tag.text
                    title_tag.extract()

                # Heuristics based cleaning of elements based on css classes
                unwanted_classes = copy(WEB_CONNECTOR_IGNORED_CLASSES)
                if self.mintlify_cleanup:
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

                # 200B is ZeroWidthSpace which we don't care for
                page_text = format_document_soup(soup).replace("\u200B", "")

                doc_batch.append(
                    Document(
                        id=current_url,
                        sections=[Section(link=current_url, text=page_text)],
                        source=DocumentSource.WEB,
                        semantic_identifier=title or current_url,
                        metadata={},
                    )
                )

                page.close()
            except Exception as e:
                logger.error(f"Failed to fetch '{current_url}': {e}")
                playwright.stop()
                restart_playwright = True
                continue

            if len(doc_batch) >= self.batch_size:
                playwright.stop()
                restart_playwright = True
                yield doc_batch
                doc_batch = []

        if doc_batch:
            playwright.stop()
            yield doc_batch


if __name__ == "__main__":
    connector = WebConnector("https://docs.danswer.dev/")
    document_batches = connector.load_from_state()
    print(next(document_batches))
