from typing import Any
from typing import Dict
from typing import Type
from typing import Union

from sqlalchemy.orm import Session

from enmedd.configs.constants import DocumentSource
from enmedd.connectors.blob.connector import BlobStorageConnector
from enmedd.connectors.confluence.connector import ConfluenceConnector
from enmedd.connectors.dropbox.connector import DropboxConnector
from enmedd.connectors.file.connector import LocalFileConnector
from enmedd.connectors.github.connector import GithubConnector
from enmedd.connectors.gitlab.connector import GitlabConnector
from enmedd.connectors.gmail.connector import GmailConnector
from enmedd.connectors.google_drive.connector import GoogleDriveConnector
from enmedd.connectors.google_site.connector import GoogleSitesConnector
from enmedd.connectors.hubspot.connector import HubSpotConnector
from enmedd.connectors.interfaces import BaseConnector
from enmedd.connectors.interfaces import EventConnector
from enmedd.connectors.interfaces import LoadConnector
from enmedd.connectors.interfaces import PollConnector
from enmedd.connectors.jira.connector import JiraConnector
from enmedd.connectors.models import InputType
from enmedd.connectors.notion.connector import NotionConnector
from enmedd.connectors.productboard.connector import ProductboardConnector
from enmedd.connectors.salesforce.connector import SalesforceConnector
from enmedd.connectors.sharepoint.connector import SharepointConnector
from enmedd.connectors.teams.connector import TeamsConnector
from enmedd.connectors.web.connector import WebConnector
from enmedd.connectors.zendesk.connector import ZendeskConnector
from enmedd.db.credentials import backend_update_credential_json
from enmedd.db.models import Credential


class ConnectorMissingException(Exception):
    pass


def identify_connector_class(
    source: DocumentSource,
    input_type: InputType | None = None,
) -> Type[BaseConnector]:
    connector_map: Dict[
        DocumentSource, Union[Type[BaseConnector], Dict[InputType, Type[BaseConnector]]]
    ] = {
        DocumentSource.WEB: WebConnector,
        DocumentSource.FILE: LocalFileConnector,
        DocumentSource.GITHUB: GithubConnector,
        DocumentSource.GMAIL: GmailConnector,
        DocumentSource.GITLAB: GitlabConnector,
        DocumentSource.GOOGLE_DRIVE: GoogleDriveConnector,
        DocumentSource.CONFLUENCE: ConfluenceConnector,
        DocumentSource.JIRA: JiraConnector,
        DocumentSource.PRODUCTBOARD: ProductboardConnector,
        DocumentSource.NOTION: NotionConnector,
        DocumentSource.HUBSPOT: HubSpotConnector,
        DocumentSource.GOOGLE_SITES: GoogleSitesConnector,
        DocumentSource.ZENDESK: ZendeskConnector,
        DocumentSource.DROPBOX: DropboxConnector,
        DocumentSource.SHAREPOINT: SharepointConnector,
        DocumentSource.TEAMS: TeamsConnector,
        DocumentSource.SALESFORCE: SalesforceConnector,
        DocumentSource.S3: BlobStorageConnector,
        DocumentSource.R2: BlobStorageConnector,
        DocumentSource.GOOGLE_CLOUD_STORAGE: BlobStorageConnector,
        DocumentSource.OCI_STORAGE: BlobStorageConnector,
    }
    connector_by_source: Union[
        Type[BaseConnector], Dict[InputType, Type[BaseConnector]]
    ] = connector_map.get(source, {})

    if isinstance(connector_by_source, dict):
        if input_type is None:
            # If not specified, default to most exhaustive update
            connector = connector_by_source.get(InputType.LOAD_STATE)
        else:
            connector = connector_by_source.get(input_type)
    else:
        connector = connector_by_source
    if connector is None:
        raise ConnectorMissingException(f"Connector not found for source={source}")

    if any(
        [
            input_type == InputType.LOAD_STATE
            and not issubclass(connector, LoadConnector),
            input_type == InputType.POLL and not issubclass(connector, PollConnector),
            input_type == InputType.EVENT and not issubclass(connector, EventConnector),
        ]
    ):
        raise ConnectorMissingException(
            f"Connector for source={source} does not accept input_type={input_type}"
        )
    return connector


def instantiate_connector(
    source: DocumentSource,
    input_type: InputType,
    connector_specific_config: dict[str, Any],
    credential: Credential,
    db_session: Session,
) -> BaseConnector:
    connector_class = identify_connector_class(source, input_type)
    connector = connector_class(**connector_specific_config)
    new_credentials = connector.load_credentials(credential.credential_json)

    if new_credentials is not None:
        backend_update_credential_json(credential, new_credentials, db_session)

    return connector
