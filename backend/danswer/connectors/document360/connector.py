import requests
from datetime import datetime, timezone
from typing import Any, Generator, Optional, List, Union
from danswer.connectors.interfaces import LoadConnector, PollConnector, GenerateDocumentsOutput, SecondsSinceUnixEpoch
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document, ConnectorMissingCredentialError

DOCUMENT360_BASE_URL = "https://preview.portal.document360.io/"
DOCUMENT360_API_BASE_URL = "https://apihub.document360.io/v2"

class Document360Connector(LoadConnector, PollConnector):
    def __init__(
        self,
        workspace: str,
        categories: List[str],
        portal_id: Optional[str] = None,
        api_token: Optional[str] = None
    ) -> None:
        self.portal_id = portal_id
        self.workspace = workspace
        self.categories = categories
        self.api_token = api_token

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.api_token = credentials.get("document360_api_token")
        self.portal_id = credentials.get("portal_id")
        return None

    def _make_request(self, endpoint: str, params: Optional[dict] = None) -> Any:
        if not self.api_token:
            raise ConnectorMissingCredentialError("Document360")

        headers = {
            'accept': "application/json",
            'api_token': self.api_token
        }

        response = requests.get(f"{DOCUMENT360_API_BASE_URL}/{endpoint}", headers=headers, params=params)
        response.raise_for_status()

        return response.json()['data']

    def _get_workspace_id_by_name(self):
        projects = self._make_request("ProjectVersions")
        return next((project['id'] for project in projects if project["version_code_name"] == self.workspace), None)
    
    def _get_articles_with_category(self, workspace_id):
        all_categories = self._make_request(f"ProjectVersions/{workspace_id}/categories")
        articles_with_category = []

        for category in all_categories:
            if category["name"] in self.categories or "ALL" in self.categories:
                for article in category["articles"]:
                    articles_with_category.append({
                        "id": article["id"],
                        "category_name": category["name"]
                    })
                for child_category in category["child_categories"]:
                    for article in child_category["articles"]:
                        articles_with_category.append({
                            "id": article["id"],
                            "category_name": child_category["name"]
                        })
        return articles_with_category

    def _process_articles(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.api_token is None:
            raise ConnectorMissingCredentialError("Document360")
        
        workspace_id = self._get_workspace_id_by_name()
        articles = self._get_articles_with_category(workspace_id)

        documents: List[Document] = []

        for article in articles:
            article_details = self._make_request(f"Articles/{article['id']}", {"langCode": "en"})
            
            updated_at = datetime.strptime(article_details["modified_at"], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=None)
            if start is not None and updated_at < start:
                continue
            if end is not None and updated_at > end:
                continue
            
            doc_link = f"{DOCUMENT360_BASE_URL}/{self.portal_id}/document/v1/article/{article['id']}"
            doc_text = f"workspace: {self.workspace}\n category: {article['category_name']}\n article: {article_details['title']} - {article_details.get('description', '')}"
            document = Document(
                id=article_details['id'],
                sections=[{
                    'link': doc_link,
                    'text': doc_text
                }],
                source=DocumentSource.DOCUMENT360,
                semantic_identifier=article_details['title'],
                metadata={}
            )
 
            documents.append(document)

        yield documents

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

    document360_connector = Document360Connector(
        "Your Workspace",
        ["Your categories"]
    )
    document360_connector.load_credentials({
        "portal_id": "Your Portal ID",
        "document360_api_token": "Your API Token"
    })
    
    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 days
    latest_docs = document360_connector.poll_source(one_day_ago, current)
    
    for doc in latest_docs:
        print(doc)
