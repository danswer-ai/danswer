from __future__ import annotations

import itertools
from typing import Any, Generator

import pywikibot
from pywikibot import pagegenerators, family

from connectors.mediawiki.generate_family_object import generate_family_class
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section


class MediaWikiConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        categories: list[str],
        pages: list[str],
        hostname: str,
        recurse_depth: int|None,
        batch_size: int = INDEX_BATCH_SIZE,
        wiki_family_shortname: str = "mediawiki",
    ) -> None:

        self.family = generate_family_class(hostname, wiki_family_shortname)()
        self.site = pywikibot.Site(fam=self.family, code='en')
        self.batch_size = batch_size

        self.categories = [pywikibot.Category(self.site, f"Category:{category.replace(' ', '_')}") for category in categories]
        self.pages = [pywikibot.Page(self.site, page) for page in pages]
        self.recurse_depth = recurse_depth


    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        return None

    def _get_doc_from_page(self, page: pywikibot.Page) -> Document:
        return Document(
            source=DocumentSource.MEDIAWIKI,
            title=page.title(),
            text=page.text,
            url=page.full_url(),
            created_at=page.oldest_revision.timestamp,
            updated_at=page.latest_revision.timestamp,
            sections=[
                Section(
                    link=page.full_url(),
                    text=page.text,
                )
            ],
            semantic_identifier=page.title(),
            metadata={
                "categories": [category.title() for category in page.categories()]
            },
            id=page.pageid,
        )

    def _get_doc_batch(
            self,
            start: SecondsSinceUnixEpoch | None = None,
            end: SecondsSinceUnixEpoch | None = None,
    ) -> Generator[list[Document], None, None]:
        doc_batch: list[Document] = []

        category_pages = [pagegenerators.PreloadingGenerator(
            pagegenerators.CategorizedPageGenerator(category, recurse=self.recurse_depth),
            groupsize=self.batch_size
        ) for category in self.categories]

        all_pages = itertools.chain(self.pages, *category_pages)
        for page in all_pages:
            if start and page.latest_revision.timestamp.timestamp() < start:
                continue
            if end and page.oldest_revision.timestamp.timestamp() > end:
                continue
            doc_batch.append(
                self._get_doc_from_page(page)
            )
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []
        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self.poll_source(None, None)

    def poll_source(
            self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        return self._get_doc_batch(start, end)


if __name__ == "__main__":
    import datetime

    HOSTNAME = "fallout.fandom.com"
    test_connector = MediaWikiConnector(
        categories=["Fallout:_New_Vegas_factions"],
        pages=["Fallout: New Vegas"],
        hostname=HOSTNAME,
        recurse_depth=1,
    )

    all_docs = list(test_connector.load_from_state())

    current = datetime.datetime.now().timestamp()
    one_day_ago = current - 24 * 60 * 60  # 1 day
    latest_docs = list(test_connector.poll_source(one_day_ago, current))
    print(latest_docs)