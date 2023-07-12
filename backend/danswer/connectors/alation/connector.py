import requests
from collections.abc import Generator
from datetime import datetime
from enum import Enum
from typing import Any
from urllib.parse import urlencode
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import HTML_SEPARATOR
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logging import setup_logger

logger = setup_logger()

class AlationObjectType(Enum):
    """Object types in Alation. NOT an extensive list"""
    ARTICLE = 'article'
    SCHEMA = 'schema'
    TABLE = 'table'
    COLUMN = 'column'

ALL_ALATION_OBJECT_TYPES = [
    AlationObjectType.ARTICLE,
    AlationObjectType.SCHEMA,
    AlationObjectType.TABLE,
    AlationObjectType.COLUMN
]

class AlationClientNotSetUpError(PermissionError):
    def __init__(self) -> None:
        super().__init__(
            "Alation Client is not set up, was load_credentials called?"
        )

class AlationClient:
    """A basic client helper to make requests to Alation

    Arugments:
    base_url -- The base URL to the Alation server (hostname is enough)
    user_id -- The ID of the user with API access
    refresh_token -- The refresh token issued by Alation
    """
    ALATION_OTYPE_TO_ENDPOINT = {
        AlationObjectType.ARTICLE: '/integration/v1/article/',
        AlationObjectType.SCHEMA: '/integration/v2/schema/',
        AlationObjectType.TABLE: '/integration/v2/table/',
        AlationObjectType.COLUMN: '/integration/v2/column/'
    }

    def __init__(self, base_url: str, user_id: str | int, refresh_token: str):
        dirty_url = urlparse(base_url)
        self.base_url = f'https://{dirty_url.hostname}'
        self.user_id = user_id
        self.refresh_token = refresh_token
        self.api_client = requests.Session()
        self.api_client.headers.update({
            'accept': 'application/json',
            'content-type': 'application/json'
        })
        self.token_expiry = None
    
    def create_url(self, url: str, params: dict[str, str]=None):
        """Helper for forming Alation URLs"""
        if params is not None:
            return f'{self.base_url}{url}?{urlencode(params)}'
        return f'{self.base_url}{url}'
    
    def _create_url_for_object(self, otype: AlationObjectType, params=None):
        """Creates an Alation API endpoint for requests for a particular
        object type. This isn't comprehensive, and won't work as a model for
        future object types. But good enough for now.
        """
        return self.create_url(self.ALATION_OTYPE_TO_ENDPOINT[otype], params)
    
    def authenticate(self):
        """Creates access tokens with the refresh token to
        make API requests.
        """
        response = self.api_client.post(
            self.create_url('/integration/v1/createAPIAccessToken/'),
            json={
                'user_id': self.user_id,
                'refresh_token': self.refresh_token
            }
        )
        data = response.json()
        self.api_client.headers.update({
            'Token': data['api_access_token']
        })
        self.token_expiry = datetime.fromisoformat(data['token_expires_at'])
    
    def _validate_access_token(self):
        """Refreshes the access token if it expires while we're making requests
        TODO - Probably needs to also check the validate API to handle expiring
        refresh tokens.
        """
        if self.token_expiry is None or \
            datetime.now(self.token_expiry.tzinfo) >= self.token_expiry:
            self.authenticate()
    
    def get_batch_for_object_type(self, otype: AlationObjectType, limit=100, skip=0):
        """A simplified function for making batch requests to get Alation objects.
        Not all Alation APIs work this way, but this'll do for current objects.
        """
        self._validate_access_token()
        response = self.api_client.get(
            self._create_url_for_object(otype, params={
                'limit': limit, 'skip': skip
            }),
        )
        response.raise_for_status()
        return response.json()


    @staticmethod
    def get_title_from_page(page: dict, otype: AlationObjectType) -> str:
        """A helper to get the title for an Alation object"""
        if otype == AlationObjectType.ARTICLE:
            if len(page['title']) == 0:
                return f"Untitled Article [{page['id']}]"
            return page['title']
        else:
            if len(page['title']) == 0:
                return page['key']
            return page['title']
    
    @staticmethod
    def get_body_from_page(page: dict, otype: AlationObjectType) -> str:
        """A helper to get some kind of document body from an Alation object"""
        if otype == AlationObjectType.ARTICLE:
            return page['body']
        else:
            return page['description']


class AlationConnector(LoadConnector):
    """Connector to the Alation Data Catalog

    Arguments:
    server_url -- URL to the Alation Server
    object_types_to_index -- List of Alation Object Types to index
    batch_size -- The maximum number of objects to index in 1 request
    max_objects_to_index_per_type -- The maximum number of objects to index for a given
    object type. This is to reduce the liklihood of rate-limiting
    """
    def __init__(
        self,
        server_url: str,
        object_types_to_index: list[AlationObjectType] = ALL_ALATION_OBJECT_TYPES,
        batch_size: int = INDEX_BATCH_SIZE,
        max_objects_to_index_per_type: int = 0
    ) -> None:
        self.batch_size = batch_size
        self.server_url = server_url
        self.object_types_to_index = object_types_to_index
        self.max_objects_to_index_per_type = max_objects_to_index_per_type

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        user_id = credentials["alation_user_id"]
        refresh_token = credentials["alation_refresh_token"]
        self.client = AlationClient(self.server_url, user_id, refresh_token)
        return None

    def _get_batch_for_object_type(self, otype: AlationObjectType, start_index: int) -> tuple[list[Document], int]:
        doc_batch: list[Document] = []

        try:
            batch = self.client.get_batch_for_object_type(otype, limit=self.batch_size, skip=start_index)
        except requests.exceptions.RequestException:
            msg = "Alation Connector unexpected request exception while processing "
            msg += f"{otype.value} with limit {self.batch_size} and start_index {start_index}"
            logger.exception(msg)
            return [], 0

        for page in batch:
            page_title = AlationClient.get_title_from_page(page, otype)
            page_html = AlationClient.get_body_from_page(page, otype)
            soup = BeautifulSoup(page_html, "html.parser")
            page_text = page_title + "\n" + soup.get_text(HTML_SEPARATOR)
            page_url = self.client.create_url(page['url'])
            doc_batch.append(
                Document(
                    id=page_url,
                    sections=[Section(link=page_url, text=page_text)],
                    source=DocumentSource.ALATION,
                    semantic_identifier=page_title,
                    metadata={},
                )
            )
        return doc_batch, len(batch)

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.client is None:
            raise AlationClientNotSetUpError()

        for otype in self.object_types_to_index:
            # For each Alation object type we support indexing, we'll go through
            # and fetch as many objects as we can before we either run into an error,
            # hit a limit or run out of objects.
            start_index = 0
            while True:
                doc_batch, num_pages = self._get_batch_for_object_type(otype, start_index)
                start_index += num_pages
                if doc_batch:
                    yield doc_batch

                if num_pages < self.batch_size or \
                    start_index >= self.max_objects_to_index_per_type:
                    break
