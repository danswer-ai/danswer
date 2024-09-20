from typing import Any
from typing import Type

from onyx.configs.constants import DocumentSource
from onyx.connectors.asana.connector import AsanaConnector
from onyx.connectors.axero.connector import AxeroConnector
from onyx.connectors.blob.connector import BlobStorageConnector
from onyx.connectors.bookstack.connector import BookstackConnector
from onyx.connectors.clickup.connector import ClickupConnector
from onyx.connectors.confluence.connector import ConfluenceConnector
from onyx.connectors.discourse.connector import DiscourseConnector
from onyx.connectors.document360.connector import Document360Connector
from onyx.connectors.dropbox.connector import DropboxConnector
from onyx.connectors.file.connector import LocalFileConnector
from onyx.connectors.github.connector import GithubConnector
from onyx.connectors.gitlab.connector import GitlabConnector
from onyx.connectors.gmail.connector import GmailConnector
from onyx.connectors.gong.connector import GongConnector
from onyx.connectors.google_drive.connector import GoogleDriveConnector
from onyx.connectors.google_site.connector import GoogleSitesConnector
from onyx.connectors.guru.connector import GuruConnector
from onyx.connectors.hubspot.connector import HubSpotConnector
from onyx.connectors.interfaces import BaseConnector
from onyx.connectors.interfaces import EventConnector
from onyx.connectors.interfaces import LoadConnector
from onyx.connectors.interfaces import PollConnector
from onyx.connectors.linear.connector import LinearConnector
from onyx.connectors.loopio.connector import LoopioConnector
from onyx.connectors.mediawiki.wiki import MediaWikiConnector
from onyx.connectors.models import InputType
from onyx.connectors.notion.connector import NotionConnector
from onyx.connectors.onyx_jira.connector import JiraConnector
from onyx.connectors.productboard.connector import ProductboardConnector
from onyx.connectors.requesttracker.connector import RequestTrackerConnector
from onyx.connectors.salesforce.connector import SalesforceConnector
from onyx.connectors.sharepoint.connector import SharepointConnector
from onyx.connectors.slab.connector import SlabConnector
from onyx.connectors.slack.connector import SlackPollConnector
from onyx.connectors.slack.load_connector import SlackLoadConnector
from onyx.connectors.teams.connector import TeamsConnector
from onyx.connectors.web.connector import WebConnector
from onyx.connectors.wikipedia.connector import WikipediaConnector
from onyx.connectors.zendesk.connector import ZendeskConnector
from onyx.connectors.zulip.connector import ZulipConnector
from onyx.db.credentials import backend_update_credential_json
from onyx.db.models import Credential
from sqlalchemy.orm import Session


class ConnectorMissingException(Exception):
    pass


def identify_connector_class(
    source: DocumentSource,
    input_type: InputType | None = None,
) -> Type[BaseConnector]:
    connector_map = {
        DocumentSource.WEB: WebConnector,
        DocumentSource.FILE: LocalFileConnector,
        DocumentSource.SLACK: {
            InputType.LOAD_STATE: SlackLoadConnector,
            InputType.POLL: SlackPollConnector,
        },
        DocumentSource.GITHUB: GithubConnector,
        DocumentSource.GMAIL: GmailConnector,
        DocumentSource.GITLAB: GitlabConnector,
        DocumentSource.GOOGLE_DRIVE: GoogleDriveConnector,
        DocumentSource.BOOKSTACK: BookstackConnector,
        DocumentSource.CONFLUENCE: ConfluenceConnector,
        DocumentSource.JIRA: JiraConnector,
        DocumentSource.PRODUCTBOARD: ProductboardConnector,
        DocumentSource.SLAB: SlabConnector,
        DocumentSource.NOTION: NotionConnector,
        DocumentSource.ZULIP: ZulipConnector,
        DocumentSource.REQUESTTRACKER: RequestTrackerConnector,
        DocumentSource.GURU: GuruConnector,
        DocumentSource.LINEAR: LinearConnector,
        DocumentSource.HUBSPOT: HubSpotConnector,
        DocumentSource.DOCUMENT360: Document360Connector,
        DocumentSource.GONG: GongConnector,
        DocumentSource.GOOGLE_SITES: GoogleSitesConnector,
        DocumentSource.ZENDESK: ZendeskConnector,
        DocumentSource.LOOPIO: LoopioConnector,
        DocumentSource.DROPBOX: DropboxConnector,
        DocumentSource.SHAREPOINT: SharepointConnector,
        DocumentSource.TEAMS: TeamsConnector,
        DocumentSource.SALESFORCE: SalesforceConnector,
        DocumentSource.DISCOURSE: DiscourseConnector,
        DocumentSource.AXERO: AxeroConnector,
        DocumentSource.CLICKUP: ClickupConnector,
        DocumentSource.MEDIAWIKI: MediaWikiConnector,
        DocumentSource.WIKIPEDIA: WikipediaConnector,
        DocumentSource.ASANA: AsanaConnector,
        DocumentSource.S3: BlobStorageConnector,
        DocumentSource.R2: BlobStorageConnector,
        DocumentSource.GOOGLE_CLOUD_STORAGE: BlobStorageConnector,
        DocumentSource.OCI_STORAGE: BlobStorageConnector,
    }
    connector_by_source = connector_map.get(source, {})

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
    db_session: Session,
    source: DocumentSource,
    input_type: InputType,
    connector_specific_config: dict[str, Any],
    credential: Credential,
) -> BaseConnector:
    connector_class = identify_connector_class(source, input_type)
    connector = connector_class(**connector_specific_config)
    new_credentials = connector.load_credentials(credential.credential_json)

    if new_credentials is not None:
        backend_update_credential_json(credential, new_credentials, db_session)

    return connector
