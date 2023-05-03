from collections.abc import AsyncGenerator
from collections.abc import Generator
from typing import Any
from typing import cast
from urllib.parse import urljoin
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.type_aliases import BatchLoader
from danswer.utils.logging import setup_logger
from playwright.async_api import async_playwright
from playwright.sync_api import sync_playwright

logger = setup_logger()
TAG_SEPARATOR = "\n"


def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except ValueError:
        return False


def get_internal_links(
    base_url: str, url: str, soup: BeautifulSoup, should_ignore_pound: bool = True
) -> list[str]:
    internal_links = []
    for link in cast(list[dict[str, Any]], soup.find_all("a")):
        href = cast(str | None, link.get("href"))
        if not href:
            continue

        if should_ignore_pound and "#" in href:
            href = href.split("#")[0]

        if not is_valid_url(href):
            href = urljoin(url, href)

        if urlparse(href).netloc == urlparse(url).netloc and base_url in href:
            internal_links.append(href)
    return internal_links


class BatchWebLoader(BatchLoader):
    def __init__(
        self,
        base_url: str,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.base_url = base_url
        self.batch_size = batch_size

    async def async_load(self) -> AsyncGenerator[list[Document], None]:
        """NOTE: TEMPORARY UNTIL ALL COMPONENTS ARE CONVERTED TO ASYNC
        At that point, this will take over from the regular `load` func.
        """
        visited_links: set[str] = set()
        to_visit: list[str] = [self.base_url]
        doc_batch: list[Document] = []

        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context()

            while to_visit:
                current_url = to_visit.pop()
                if current_url in visited_links:
                    continue
                visited_links.add(current_url)

                try:
                    page = await context.new_page()
                    await page.goto(current_url)
                    content = await page.content()
                    soup = BeautifulSoup(content, "html.parser")

                    # Heuristics based cleaning
                    for undesired_tag in ["nav", "header", "footer", "meta"]:
                        [tag.extract() for tag in soup.find_all(undesired_tag)]
                    for undesired_div in ["sidebar", "header", "footer"]:
                        [
                            tag.extract()
                            for tag in soup.find_all("div", {"class": undesired_div})
                        ]

                    page_text = soup.get_text(TAG_SEPARATOR)

                    doc_batch.append(
                        Document(
                            id=current_url,
                            sections=[Section(link=current_url, text=page_text)],
                            source=DocumentSource.WEB,
                            metadata={},
                        )
                    )

                    internal_links = get_internal_links(
                        self.base_url, current_url, soup
                    )
                    for link in internal_links:
                        if link not in visited_links:
                            to_visit.append(link)

                    await page.close()
                except Exception as e:
                    logger.error(f"Failed to fetch '{current_url}': {e}")
                    continue

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

            if doc_batch:
                yield doc_batch

    def load(self) -> Generator[list[Document], None, None]:
        """Traverses through all pages found on the website
        and converts them into documents"""
        visited_links: set[str] = set()
        to_visit: list[str] = [self.base_url]
        doc_batch: list[Document] = []

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context()

            while to_visit:
                current_url = to_visit.pop()
                if current_url in visited_links:
                    continue
                visited_links.add(current_url)

                try:
                    page = context.new_page()
                    page.goto(current_url)
                    content = page.content()
                    soup = BeautifulSoup(content, "html.parser")

                    # Heuristics based cleaning
                    for undesired_tag in ["nav", "header", "footer", "meta"]:
                        [tag.extract() for tag in soup.find_all(undesired_tag)]
                    for undesired_div in ["sidebar", "header", "footer"]:
                        [
                            tag.extract()
                            for tag in soup.find_all("div", {"class": undesired_div})
                        ]

                    page_text = soup.get_text(TAG_SEPARATOR)

                    doc_batch.append(
                        Document(
                            id=current_url,
                            sections=[Section(link=current_url, text=page_text)],
                            source=DocumentSource.WEB,
                            metadata={},
                        )
                    )

                    internal_links = get_internal_links(
                        self.base_url, current_url, soup
                    )
                    for link in internal_links:
                        if link not in visited_links:
                            to_visit.append(link)

                    page.close()
                except Exception as e:
                    logger.error(f"Failed to fetch '{current_url}': {e}")
                    continue

                if len(doc_batch) >= self.batch_size:
                    yield doc_batch
                    doc_batch = []

            if doc_batch:
                yield doc_batch
