"""
This is the XenforoConnector class. It is used to connect to a Xenforo forum and load or update documents from the forum.

To use this class, you need to provide the URL of the Xenforo forum board you want to connect to when creating an instance
of the class. The URL should be a string that starts with 'http://' or 'https://', followed by the domain name of the 
forum, followed by the board name. For example:

    forum_url = 'https://www.example.com/forum/boards/some-topic/'

The `load_from_state` method is used to load documents from the forum. It takes an optional `state` parameter, which 
can be used to specify a state from which to start loading documents.

The `poll_source` method is used to incrementally update documents based on a provided time range. It takes two 
parameters, `start` and `end`, which specify the start and end of the time range, respectively.
"""
import re
from typing import Any, Dict
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from danswer.connectors.interfaces import (
    LoadConnector,
    PollConnector,
    SecondsSinceUnixEpoch,
    GenerateDocumentsOutput,
)

from danswer.utils.logger import setup_logger

from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document

from danswer.connectors.models import Section


def requestsite(self, url):
    try:
        response = requests.get(
            url, cookies=self.cookies, headers=self.headers, timeout=10
        )
        if response.status_code != 200:
            self.logger.error(
                f"<{url}> Request Error: {response.status_code} - {response.reason}"
            )
        return BeautifulSoup(response.text, "html.parser")
    except TimeoutError:
        self.logger.error("Timed out Error.")
        pass
    except Exception as e:
        self.logger.error(f"Error on {url}")
        self.logger.exception(e)
        pass
    return BeautifulSoup("", "html.parser")


def get_title(soup):
    title = soup.find("h1", "p-title-value").text
    for char in (";", ":", "!", "*", "/", "\\", "?", '"', "<", ">", "|"):
        title = title.replace(char, "_")
    return title


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


def scrape_page(soup, url) -> list:
    title = get_title(soup)
    docs = []
    for post in soup.find_all("div", class_="block-body"):
        post_text = post.get_text()
        document = Document(
            id=f"{DocumentSource.XENFORO.value}:{title}",
            sections=[Section(link=url, text=post_text)],
            title=title,
            text=post_text,
            source=DocumentSource.WEB,
            semantic_identifier=title,
            metadata={"type": "post"},
        )
        docs.append(document)
    return docs


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
                stripped = link[0 : link.rfind("/") + 1]
                if base_url + stripped not in threads:
                    threads.append(base_url + stripped)
    return threads


class XenforoConnector(LoadConnector, PollConnector):
    def __init__(self, forumUrl: str):
        self.forum_url = forumUrl
        self.cookies = {}
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 "
            "Safari/537.36"
        }
        self.logger = setup_logger(__name__)

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        username = credentials.get('username')
        password = credentials.get('password')
        if not username or not password:
            self.logger.warning("Username or password not provided for XenforoConnector")
        return None

    def load_from_state(self, state: Dict[str, Any] = None) -> GenerateDocumentsOutput:
        # If state is None, initialize it as an empty dictionary
        if state is None:
            state = {}

        # Standardize URL to always end in /.
        if self.forum_url[-1] != "/":
            self.forum_url += "/"

        # Remove all extra parameters from the end such as page, post.
        matches = ("threads/", "boards/")
        for each in matches:
            if each in self.forum_url:
                try:
                    self.forum_url = self.forum_url[
                        0 : self.forum_url.index(
                            "/", self.forum_url.index(each) + len(each)
                        )
                        + 1
                    ]
                except ValueError:
                    pass

        documents = []
        # Input is a forum category, find all threads in this category and scrape them.
        if "boards/" or "forums/" in self.forum_url:
            all_threads = []
            pages = get_pages(requestsite(self, self.forum_url), self.forum_url)

            # Get all pages on category
            for pre_count, category in enumerate(pages, start=1):
                self.logger.info(
                    f"\x1b[KGetting pages from category.. Current: {pre_count}/{len(pages)}\r"
                )
                all_threads += get_threads(self, self.forum_url)

            # Getting all threads from category pages
            for thread_count, thread in enumerate(all_threads, start=1):
                soup = requestsite(self, thread)
                pages = get_pages(soup, thread)
                # Getting all pages for all threads
                for page_count, page in enumerate(pages, start=1):
                    self.logger.info(
                        f"\x1b[KProgress: Page {page_count}/{len(pages)} - Thread {thread_count}/{len(all_threads)}\r"
                    )
                    documents.extend(scrape_page(requestsite(self, page), thread))

                yield documents
        # If the URL contains "threads/", scrape the thread
        if "threads/" in self.forum_url:
            soup = requestsite(self, self.forum_url)
            if soup is None:
                self.logger.error(f"Failed to load page: {self.forum_url}")
                yield documents

            pages = get_pages(soup, self.forum_url)
            for page_count, page in enumerate(pages, start=1):
                soup = requestsite(self, self.forum_url + "page-" + str(page_count))
                if soup is None:
                    self.logger.error(
                        f"Failed to load page: {self.forum_url + 'page-' + str(page_count)}"
                    )
                    continue

                documents.extend(scrape_page(soup, page))
                yield documents

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        # Fetch all documents from the forum
        all_documents = self.load_from_state()

        # Filter the documents based on the start and end times
        documents = [
            doc for doc in all_documents
            if start <= doc.timestamp <= end
        ]

        yield documents
