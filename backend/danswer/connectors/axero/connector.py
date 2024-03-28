import time
from datetime import datetime
from datetime import timezone
from typing import Any

import requests

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.html_utils import parse_html_page_basic
from danswer.connectors.cross_connector_utils.miscellaneous_utils import (
    process_in_batches,
)
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger


logger = setup_logger()


ENTITY_NAME_MAP = {1: "Forum", 3: "Article", 4: "Blog", 9: "Wiki"}


def _get_auth_header(api_key: str) -> dict[str, str]:
    return {"Rest-Api-Key": api_key}


# https://my.axerosolutions.com/spaces/5/communifire-documentation/wiki/view/595/rest-api-get-content-list
def _get_entities(
    entity_type: int,
    api_key: str,
    axero_base_url: str,
    start: datetime,
    end: datetime,
) -> list[dict]:
    endpoint = axero_base_url + "api/content/list"
    page_num = 1
    pages_fetched = 0
    pages_to_return = []
    break_out = False
    while True:
        params = {
            "EntityType": str(entity_type),
            "SortColumn": "DateUpdated",
            "SortOrder": "1",  # descending
            "StartPage": str(page_num),
        }
        res = requests.get(endpoint, headers=_get_auth_header(api_key), params=params)
        res.raise_for_status()

        # Axero limitations:
        # No next page token, can paginate but things may have changed
        # for example, a doc that hasn't been read in by Danswer is updated and is now front of the list
        # due to this limitation and the fact that Axero has no rate limiting but API calls can cause
        # increased latency for the team, we have to just fetch all the pages quickly to reduce the
        # chance of missing a document due to an update (it will still get updated next pass)
        # Assumes the volume of data isn't too big to store in memory (probably fine)
        data = res.json()
        total_records = data["TotalRecords"]
        contents = data["ResponseData"]
        pages_fetched += len(contents)
        logger.debug(f"Fetched {pages_fetched} {ENTITY_NAME_MAP[entity_type]}")

        for page in contents:
            update_time = time_str_to_utc(page["DateUpdated"])

            if update_time > end:
                continue

            if update_time < start:
                break_out = True
                break

            pages_to_return.append(page)

        if pages_fetched >= total_records:
            break

        page_num += 1

        if break_out:
            break

    return pages_to_return


def _translate_content_to_doc(content: dict) -> Document:
    page_text = ""
    summary = content.get("ContentSummary")
    body = content.get("ContentBody")
    if summary:
        page_text += f"{summary}\n"

    if body:
        content_parsed = parse_html_page_basic(body)
        page_text += content_parsed

    doc = Document(
        id="AXERO_" + str(content["ContentID"]),
        sections=[Section(link=content["ContentVersionURL"], text=page_text)],
        source=DocumentSource.AXERO,
        semantic_identifier=content["ContentTitle"],
        doc_updated_at=time_str_to_utc(content["DateUpdated"]),
        metadata={"space": content["SpaceName"]},
    )

    return doc


class AxeroConnector(PollConnector):
    def __init__(
        self,
        base_url: str,
        include_article: bool = True,
        include_blog: bool = True,
        include_wiki: bool = True,
        # Forums not supported atm
        include_forum: bool = False,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.include_article = include_article
        self.include_blog = include_blog
        self.include_wiki = include_wiki
        self.include_forum = include_forum
        self.batch_size = batch_size
        self.axero_key = None

        if not base_url.endswith("/"):
            base_url += "/"
        self.base_url = base_url

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.axero_key = credentials["axero_api_token"]
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if not self.axero_key:
            raise ConnectorMissingCredentialError("Axero")

        start_datetime = datetime.utcfromtimestamp(start).replace(tzinfo=timezone.utc)
        end_datetime = datetime.utcfromtimestamp(end).replace(tzinfo=timezone.utc)

        entity_types = []
        if self.include_article:
            entity_types.append(3)
        if self.include_blog:
            entity_types.append(4)
        if self.include_wiki:
            entity_types.append(9)
        if self.include_forum:
            raise NotImplementedError("Forums for Axero not supported currently")

        for entity in entity_types:
            articles = _get_entities(
                entity_type=entity,
                api_key=self.axero_key,
                axero_base_url=self.base_url,
                start=start_datetime,
                end=end_datetime,
            )
            yield from process_in_batches(
                objects=articles,
                process_function=_translate_content_to_doc,
                batch_size=self.batch_size,
            )


if __name__ == "__main__":
    import os

    connector = AxeroConnector(base_url=os.environ["AXERO_BASE_URL"])
    connector.load_credentials({"axero_api_token": os.environ["AXERO_API_TOKEN"]})
    current = time.time()

    one_year_ago = current - 24 * 60 * 60 * 360
    latest_docs = connector.poll_source(one_year_ago, current)

    print(next(latest_docs))
