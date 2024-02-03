"""
This is the XenforoConnector class. It is used to connect to a Xenforo forum and load or update documents from the forum.

To use this class, you need to provide the URL of the Xenforo forum board you want to connect to when creating an instance
of the class. The URL should be a string that starts with 'http://' or 'https://', followed by the domain name of the 
forum, followed by the board name. For example:

    base_url = 'https://www.example.com/forum/boards/some-topic/'

The `load_from_state` method is used to load documents from the forum. It takes an optional `state` parameter, which 
can be used to specify a state from which to start loading documents.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse

import pytz
import requests
from bs4 import BeautifulSoup
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import (
    LoadConnector,
    GenerateDocumentsOutput,
)
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

from danswer.connectors.cross_connector_utils.miscellaneous_utils import datetime_to_utc

from danswer.connectors.models import BasicExpertInfo

logger = setup_logger()


def requestsite(self, url):
    try:
        response = requests.get(
            url, cookies=self.cookies, headers=self.headers, timeout=10
        )
        if response.status_code != 200:
            logger.error(
                f"<{url}> Request Error: {response.status_code} - {response.reason}"
            )
        return BeautifulSoup(response.text, "html.parser")
    except TimeoutError:
        logger.error("Timed out Error.")
        pass
    except Exception as e:
        logger.error(f"Error on {url}")
        logger.exception(e)
        pass
    return BeautifulSoup("", "html.parser")


def get_title(soup):
    title = soup.find("h1", "p-title-value").text
    for char in (";", ":", "!", "*", "/", "\\", "?", '"', "<", ">", "|"):
        title = title.replace(char, "_")
    return title


def get_threads(self, url):
    soup = requestsite(self, url)
    thread_tags = soup.find_all(class_="structItem-title")
    base_url = "{uri.scheme}://{uri.netloc}".format(uri=urlparse(url))
    threads = []
    for x in thread_tags:
        y = x.find_all(href=True)
        for element in y:
            link = element["href"]
            if "threads/" in link:
                stripped = link[0: link.rfind("/") + 1]
                if base_url + stripped not in threads:
                    threads.append(base_url + stripped)
    return threads


def get_pages(soup, url):
    page_tags = soup.select("li.pageNav-page")
    page_numbers = []
    for button in page_tags:
        if re.match("^\d+$", button.text):
            page_numbers.append(button.text)

    try:
        max_pages = max(page_numbers, key=int)
    except ValueError:
        max_pages = 1

    all_pages = []
    for x in range(1, int(max_pages) + 1):
        all_pages.append(f"{url}page-{x}")
    return all_pages


def parse_post_date(post_element: BeautifulSoup):
    date_string = post_element.find('time')['datetime']
    post_date = datetime.strptime(date_string, '%Y-%m-%dT%H:%M:%S%z')
    return datetime_to_utc(post_date)


def scrape_page_posts(soup, url, initial_run, start_time) -> list:
    title = get_title(soup)

    documents = []
    for post in soup.find_all("div", class_="message-inner"):
        post_date = parse_post_date(post)
        if initial_run or post_date > start_time:
            post_text = post.find("div", class_="bbWrapper").get_text(strip=True) + "\n"
            author_tag = post.find("a", class_="username")
            if author_tag is None:
                author_tag = post.find("span", class_="username")
            author = author_tag.get_text(strip=True) if author_tag else "Deleted author"
            document = Document(
                id=f"{DocumentSource.XENFORO.value}__{title}",
                sections=[Section(link=url, text=post_text)],
                title=title,
                text=post_text,
                source=DocumentSource.WEB,
                semantic_identifier=title,
                primary_owners=[BasicExpertInfo(display_name=author)],
                metadata={"type": "post", "author": author, "time": post_date.strftime('%Y-%m-%d %H:%M:%S')},
                doc_updated_at=post_date,
            )
            documents.append(document)
    return documents


class XenforoConnector(LoadConnector):

    # Class variable to track if the connector has been run before
    has_been_run_before = False

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url
        self.initial_run = not XenforoConnector.has_been_run_before
        self.start = datetime.utcnow().replace(tzinfo=pytz.utc) - timedelta(days=1)
        self.cookies = {}
        # mimic user browser to avoid being blocked by the website (see: https://www.useragents.me/)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        if credentials:
            logger.warning("Unexpected credentials provided for Xenforo Connector")
        return None

    def load_from_state(self) -> GenerateDocumentsOutput:

        # Standardize URL to always end in /.
        if self.base_url[-1] != "/":
            self.base_url += "/"

        # Remove all extra parameters from the end such as page, post.
        matches = ("threads/", "boards/", "forums/")
        for each in matches:
            if each in self.base_url:
                try:
                    self.base_url = self.base_url[0: self.base_url.index("/", self.base_url.index(each) + len(each)) + 1]
                except ValueError:
                    pass

        doc_batch: list[Document] = []
        all_threads = []

        # If the URL contains "boards/" or "forums/", find all threads.
        if "boards/" in self.base_url or "forums/" in self.base_url:
            pages = get_pages(requestsite(self, self.base_url), self.base_url)

            # Get all pages on thread_list_page
            for pre_count, thread_list_page in enumerate(pages, start=1):
                logger.info(
                    f"\x1b[KGetting pages from thread_list_page.. Current: {pre_count}/{len(pages)}\r"
                )
                all_threads += get_threads(self, thread_list_page)
        # If the URL contains "threads/", add the thread to the list.
        elif "threads/" in self.base_url:
            all_threads.append(self.base_url)

        # Process all threads
        for thread_count, thread_url in enumerate(all_threads, start=1):
            soup = requestsite(self, thread_url)
            if soup is None:
                logger.error(f"Failed to load page: {self.base_url}")
                continue
            pages = get_pages(soup, thread_url)
            # Getting all pages for all threads
            for page_count, page in enumerate(pages, start=1):
                logger.info(f"Visiting {page}")
                logger.info(
                    f"\x1b[KProgress: Page {page_count}/{len(pages)} - Thread {thread_count}/{len(all_threads)}\r"
                )
                soup_url = requestsite(self, page)
                doc_batch.extend(scrape_page_posts(soup_url, thread_url, self.initial_run, self.start))
            if doc_batch:
                yield doc_batch

        # Mark the initial run finished after all threads and pages have been processed
        XenforoConnector.has_been_run_before = True


if __name__ == "__main__":
    connector = XenforoConnector(base_url="https://cassiopaea.org/forum/threads/how-to-change-your-emotional-state.41381/")
    document_batches = connector.load_from_state()
    print(next(document_batches))
