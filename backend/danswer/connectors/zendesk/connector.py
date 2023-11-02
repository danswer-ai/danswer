from typing import Any
from zenpy import Zenpy
from zenpy.lib.api_objects.help_centre_objects import Article

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document, Section
from danswer.connectors.interfaces import GenerateDocumentsOutput, LoadConnector, PollConnector, SecondsSinceUnixEpoch

class ZendeskClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__(
            "Zendesk Client is not set up, was load_credentials called?"
        )


class ZendeskConnector(LoadConnector, PollConnector):
    def __init__(
            self,
            batch_size: int = INDEX_BATCH_SIZE
    ) -> None:
        self.batch_size = batch_size
        self.zendesk_client: Zenpy | None = None
    
    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.zendesk_client = Zenpy(
            subdomain=credentials["zendesk_subdomain"],
            email=credentials["zendesk_email"],
            token=credentials["zendesk_token"],
        )
        return None
    
    def load_from_state(self) -> GenerateDocumentsOutput:
        return self.poll_source(None, None)
    
    def _article_to_document(self, article: Article) -> Document:
        return Document(
            id=f"article:{article.id}",
            sections=[Section(link=article.html_url, text=article.body)],
            source=DocumentSource.ZENDESK,
            semantic_identifier="Article: " + article.title,
            metadata={
                "type": "article",
                "updated_at": article.updated_at,
            }
        )


    def poll_source(self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None) -> GenerateDocumentsOutput:
        if self.zendesk_client is None:
            raise ZendeskClientNotSetUpError()
        
        articles = self.zendesk_client.help_center.articles(cursor_pagination=True) if start is None else self.zendesk_client.help_center.articles.incremental(start_time=int(start))
        doc_batch = []
        for article in articles:
            if article.body is None:
                continue

            doc_batch.append(self._article_to_document(article))
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch.clear()

