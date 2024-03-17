from __future__ import annotations

import datetime
import itertools
from collections.abc import Generator
from typing import Any

import pywikibot.time
from pywikibot import pagegenerators
from pywikibot import textlib

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.mediawiki.family import family_class_dispatch
from danswer.connectors.models import Document
from danswer.connectors.models import Section


def pywikibot_timestamp_to_utc_datetime(
    timestamp: pywikibot.time.Timestamp,
) -> datetime.datetime:
    return datetime.datetime.astimezone(timestamp, tz=datetime.timezone.utc)


class MediaWikiConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        hostname: str,
        categories: list[str],
        pages: list[str],
        recurse_depth: int | None,
        connector_name: str,
        language_code: str = "en",
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.connector_name = connector_name
        # short names can only have ascii letters and digits
        connector_name = "".join(ch for ch in connector_name if ch.isalnum())
        self.family = family_class_dispatch(hostname, connector_name)()
        self.site = pywikibot.Site(fam=self.family, code=language_code)
        self.batch_size = batch_size

        self.categories = [
            pywikibot.Category(self.site, f"Category:{category.replace(' ', '_')}")
            for category in categories
        ]
        self.pages = [pywikibot.Page(self.site, page) for page in pages]
        self.recurse_depth = int(recurse_depth) if recurse_depth is not None else None
        if not isinstance(self.recurse_depth, int):
            raise ValueError(
                f"recurse_depth must be an integer. Got {recurse_depth} (type {type(recurse_depth)}) instead."
            )

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        return None

    def _get_doc_from_page(self, page: pywikibot.Page) -> Document:
        page_text = page.text
        sections_extracted: textlib.Content = textlib.extract_sections(
            page_text, self.site
        )

        sections = [
            Section(
                link=f"{page.full_url()}#" + section.heading.replace(" ", "_"),
                text=section.title + "\n" + section.content,
            )
            for section in sections_extracted.sections
        ]
        sections.append(
            Section(
                link=page.full_url(),
                text=sections_extracted.header,
            )
        )

        return Document(
            source=DocumentSource.MEDIAWIKI,
            title=page.title(),
            doc_updated_at=pywikibot_timestamp_to_utc_datetime(
                page.latest_revision.timestamp
            ),
            sections=sections,
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
        category_pages = [
            pagegenerators.PreloadingGenerator(
                pagegenerators.EdittimeFilterPageGenerator(
                    pagegenerators.CategorizedPageGenerator(
                        category, recurse=self.recurse_depth
                    ),
                    last_edit_start=datetime.datetime.fromtimestamp(start)
                    if start
                    else None,
                    last_edit_end=datetime.datetime.fromtimestamp(end) if end else None,
                ),
                groupsize=self.batch_size,
            )
            for category in self.categories
        ]

        all_pages = itertools.chain(self.pages, *category_pages)
        for page in all_pages:
            if start and page.latest_revision.timestamp.timestamp() < start:
                continue
            if end and page.oldest_revision.timestamp.timestamp() > end:
                continue
            doc_batch.append(self._get_doc_from_page(page))
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
    HOSTNAME = "fallout.fandom.com"
    test_connector = MediaWikiConnector(
        connector_name="Fallout",
        hostname=HOSTNAME,
        categories=["Fallout:_New_Vegas_factions"],
        pages=["Fallout: New Vegas"],
        recurse_depth=1,
    )

    all_docs = list(test_connector.load_from_state())
    print("All docs", all_docs)
    current = datetime.datetime.now().timestamp()
    one_day_ago = current - 30 * 24 * 60 * 60  # 30 days
    latest_docs = list(test_connector.poll_source(one_day_ago, current))
    print("Latest docs", latest_docs)
