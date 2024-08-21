import os
import tempfile
import io
import re
import zipfile
from typing import Any
from typing import cast
from typing import Tuple
from typing import IO
from urllib.parse import urljoin
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import BrowserContext
from playwright.sync_api import Playwright
from playwright.sync_api import sync_playwright
from sqlalchemy.orm import Session

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.db.engine import get_sqlalchemy_engine
from danswer.file_processing.html_utils import web_html_cleanup
from danswer.file_store.file_store import get_default_file_store
from danswer.utils.logger import setup_logger

logger = setup_logger()

class GitlabPagesConnector(LoadConnector):
    def __init__(
        self,
        zip_path: str,
        base_url: str,
        mintlify_cleanup: bool = True,  # Mostly ok to apply to other websites as well
        batch_size: int = INDEX_BATCH_SIZE,
    ):
        self.zip_path = zip_path
        self.base_url = base_url
        self.mintlify_cleanup = mintlify_cleanup
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        pass

    def load_from_state(self) -> GenerateDocumentsOutput:

        if os.getenv("GITLAB_PAGES_ZIP_PATH", "") != "":
            file_content_io = io.BytesIO()
            zip_path = os.environ["GITLAB_PAGES_ZIP_PATH"]
            with open(zip_path, 'rb') as file:
                file_content_io.write(file.read())    
            # Seek to the beginning of the stream
            file_content_io.seek(0)
        else:
            with Session(get_sqlalchemy_engine()) as db_session:
                file_content_io = get_default_file_store(db_session).read_file(
                    self.zip_path, mode="b"
                )

        with tempfile.TemporaryDirectory() as temp_dir:
            
            logger.debug(f'Temporary directory: {temp_dir}')
            
            # TODO Handle extraction failure to temporary directory
            try:
                self._extract_files_from_zip(file_content_io, temp_dir)
            except Exception as e:
                last_error = f"Failed to extract  '{self.zip_path}' into '{temp_dir}': {e}"
                logger.error(last_error)

            base_path = os.path.abspath(os.path.join(temp_dir, 'public'))
            file_path = os.path.join(base_path, 'index.html')
            base_uri = f'file://{base_path}'
            file_uri = f'file://{file_path}' 

            visited_links: set[str] = set()
            to_visit: list[str] = [file_uri]

            documents: list[Document] = []

            # Needed to report error
            at_least_one_doc = False
            last_error = None

            playwright, context = self._start_playwright()
            restart_playwright = False

            while to_visit:
                current_uri = to_visit.pop()
                if current_uri in visited_links:
                    continue
                visited_links.add(current_uri)

                logger.info(f"Visiting {current_uri}")
                
                try:

                    if restart_playwright:
                        playwright, context = self._start_playwright()
                        restart_playwright = False

                    # Handle non-HTML files
                    current_uri_extension = current_uri.split(".")[-1]
                    if current_uri_extension and current_uri_extension != "html":
                        documents_from_non_html_files = self._handle_non_html_files(current_uri)
                        if len(documents_from_non_html_files) > 0:
                             documents.extend(documents_from_non_html_files)
                        continue

                    page = context.new_page()
                    page_response = page.goto(current_uri)

                    content = page.content()
                    soup = BeautifulSoup(content, "html.parser")

                    internal_links = self._get_internal_links(base_uri, current_uri, soup)
                    for link in internal_links:
                        if link not in visited_links:
                            to_visit.append(link)
                    
                    if page_response and str(page_response.status)[0] in ("4", "5"):
                        last_error = f"Skipped indexing {current_uri} due to FILE {page_response.status} response"
                        logger.info(last_error)
                        continue

                    parsed_html = web_html_cleanup(soup, self.mintlify_cleanup)

                    path = current_uri[len(base_uri):]
                    link = self.base_url.rstrip("/") + "/" + path.lstrip("/")
                    documents.append(
                        Document(
                            id=f"{DocumentSource.GITLAB_PAGES.value}:{link}",
                            sections=[
                                Section(
                                    link=(link)
                                    if path
                                    else "",
                                    text=parsed_html.cleaned_text,
                                )
                            ],
                            source=DocumentSource.GITLAB_PAGES,
                            semantic_identifier=parsed_html.title or path,
                            metadata={},
                        )
                    )

                    page.close()
                except Exception as e:
                    last_error = f"Failed to fetch '{current_uri}': {e}"
                    logger.error(last_error)
                    playwright.stop()
                    restart_playwright = True
                    continue

                if len(documents) >= self.batch_size:
                    playwright.stop()
                    restart_playwright = True
                    at_least_one_doc = True
                    yield documents
                    documents = []

            if documents:
                playwright.stop()
                at_least_one_doc = True
                yield documents

            if not at_least_one_doc:
                if last_error:
                    raise RuntimeError(last_error)
                raise RuntimeError("No valid pages found.")
    
    def _start_playwright(self) -> Tuple[Playwright, BrowserContext]:
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(headless=True)

        context = browser.new_context()

        return playwright, context
    
    def _extract_files_from_zip(
        self,
        zip_file_io: IO,
        extract_dir: str,
    ):
        with zipfile.ZipFile(zip_file_io, "r") as zip_file:
            zip_file.extractall(extract_dir)

    def _get_internal_links(
        self, base_uri: str, uri: str, soup: BeautifulSoup, should_ignore_pound: bool = True
    ) -> set[str]:
        internal_links = set()
        internal_href_links = self._get_href_internal_links(base_uri, uri, soup, should_ignore_pound)
        internal_links.update(internal_href_links)
        internal_button_onclick_window_open_links = self._get_button_onclick_window_open_internal_links(base_uri, uri, soup, should_ignore_pound)
        internal_links.update(internal_button_onclick_window_open_links)
        return internal_links
    
    def _get_href_internal_links(
        self, base_uri: str, uri: str, soup: BeautifulSoup, should_ignore_pound: bool = True
    ) -> set[str]:
        internal_links = set()
        for link in cast(list[dict[str, Any]], soup.find_all("a")):
            href = cast(str | None, link.get("href"))
            if not href:
                continue

            if should_ignore_pound and "#" in href:
                href = href.split("#")[0]

            if not self._is_valid_uri(href):
                # Relative path handling
                href = urljoin(uri, href)

            href_netloc = urlparse(href).netloc
            uri_netloc = urlparse(uri).netloc
            if href_netloc == uri_netloc and base_uri in href:
                internal_links.add(href)
        return internal_links

    def _get_button_onclick_window_open_internal_links(
        self, base_uri: str, uri: str, soup: BeautifulSoup, should_ignore_pound: bool = True
    ) -> set[str]:
        internal_links = set()
        for button in cast(list[dict[str, Any]], soup.find_all("button")):
            onclick = button.get('onclick')
            if not onclick:
                continue

            match = re.search(r"window\.open\('([^']+)'", onclick)
            if match:
                button_onclick_open = match.group(1)

                if button_onclick_open == None or button_onclick_open == "":
                    continue

                if not self._is_valid_uri(button_onclick_open):
                    # Relative path handling
                    button_onclick_open = urljoin(uri, button_onclick_open)

                href_netloc = urlparse(button_onclick_open).netloc
                uri_netloc = urlparse(uri).netloc
                if href_netloc == uri_netloc and base_uri in button_onclick_open:
                    internal_links.add(button_onclick_open)

        return internal_links
    
    def _is_valid_uri(self, uri: str) -> bool:
        try:
            result = urlparse(uri)
            return all([result.scheme, result.netloc])
        except ValueError:
            return False
        
    def _handle_non_html_files(self, uri: str) -> list[Document]:
        documents: list[Document] = []
        extension = uri.split(".")[-1]
        # Note: We are not handling any non-HTML files for now
        logger.warning(f"Skipping {uri} due to unsupported extension {extension}")
        return documents

if __name__ == "__main__":
    connector = GitlabPagesConnector(
        os.environ["GITLAB_PAGES_ZIP_PATH"],
        os.environ.get("GITLAB_PAGES_BASE_URL", ""),
    )
    for doc_batch in connector.load_from_state():
        for doc in doc_batch:
            print(doc)
