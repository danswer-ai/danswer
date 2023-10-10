from datetime import datetime
from typing import Any
from typing import List
from typing import Optional

import requests
from bs4 import BeautifulSoup

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section

DOCUMENT360_BASE_URL = "https://preview.portal.document360.io/"
DOCUMENT360_API_BASE_URL = "https://apihub.document360.io/v2"


class Document360Connector(LoadConnector, PollConnector):
    def __init__(
        self,
        workspace: str,
        categories: List[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
        portal_id: Optional[str] = None,
        api_token: Optional[str] = None,
    ) -> None:
        self.portal_id = portal_id
        self.workspace = workspace
        self.categories = categories
        self.batch_size = batch_size
        self.api_token = api_token

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.api_token = credentials.get("document360_api_token")
        self.portal_id = credentials.get("portal_id")
        return None

    def _make_request(self, endpoint: str, params: Optional[dict] = None) -> Any:
        if not self.api_token:
            raise ConnectorMissingCredentialError("Document360")

        headers = {"accept": "application/json", "api_token": self.api_token}

        response = requests.get(
            f"{DOCUMENT360_API_BASE_URL}/{endpoint}", headers=headers, params=params
        )
        response.raise_for_status()

        return response.json()["data"]

    def _get_workspace_id_by_name(self) -> str:
        projects = self._make_request("ProjectVersions")
        workspace_id = next(
            (
                project["id"]
                for project in projects
                if project["version_code_name"] == self.workspace
            ),
            None,
        )
        if workspace_id is None:
            raise ConnectorMissingCredentialError("Document360")

        return workspace_id

    def _get_articles_with_category(self, workspace_id) -> List[dict[str, Any]]:
        all_categories = self._make_request(
            f"ProjectVersions/{workspace_id}/categories"
        )
        articles_with_category = []

        for category in all_categories:
            if category["name"] in self.categories or self.categories is None:
                for article in category["articles"]:
                    articles_with_category.append(
                        {"id": article["id"], "category_name": category["name"]}
                    )
                for child_category in category["child_categories"]:
                    for article in child_category["articles"]:
                        articles_with_category.append(
                            {
                                "id": article["id"],
                                "category_name": child_category["name"],
                            }
                        )
        return articles_with_category

    def _process_articles(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.api_token is None:
            raise ConnectorMissingCredentialError("Document360")

        workspace_id = self._get_workspace_id_by_name()
        articles = self._get_articles_with_category(workspace_id)

        doc_batch: List[Document] = []

        for article in articles:
            article_details = self._make_request(
                f"Articles/{article['id']}", {"langCode": "en"}
            )

            updated_at = datetime.strptime(
                article_details["modified_at"], "%Y-%m-%dT%H:%M:%S.%fZ"
            ).replace(tzinfo=None)
            if start is not None and updated_at < start:
                continue
            if end is not None and updated_at > end:
                continue

            doc_link = f"{DOCUMENT360_BASE_URL}/{self.portal_id}/document/v1/view/{article['id']}"

            html_content = article_details["html_content"]
            soup = BeautifulSoup(html_content, "html.parser")
            article_content = soup.get_text()
            doc_text = (
                f"workspace: {self.workspace}\n"
                f"category: {article['category_name']}\n"
                f"article: {article_details['title']} - "
                f"{article_details.get('description', '')} - "
                f"{article_content}"
            )

            document = Document(
                id=article_details["id"],
                sections=[Section(link=doc_link, text=doc_text)],
                source=DocumentSource.DOCUMENT360,
                semantic_identifier=article_details["title"],
                metadata={},
            )

            doc_batch.append(document)

            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._process_articles()

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        start_datetime = datetime.fromtimestamp(start)
        end_datetime = datetime.fromtimestamp(end)
        return self._process_articles(start_datetime, end_datetime)


if __name__ == "__main__":
    import time

    document360_connector = Document360Connector("Your Workspace", ["Your categories"])
    document360_connector.load_credentials(
        {"portal_id": "Your Portal ID", "document360_api_token": "Your API Token"}
    )

    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 days
    latest_docs = document360_connector.poll_source(one_day_ago, current)

    for doc in latest_docs:
        print(doc)
