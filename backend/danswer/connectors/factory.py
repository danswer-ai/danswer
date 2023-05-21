import time
from collections.abc import Generator
from typing import Any

from danswer.configs.constants import DocumentSource
from danswer.connectors.confluence.connector import ConfluenceConnector
from danswer.connectors.github.connector import GithubConnector
from danswer.connectors.google_drive.connector import GoogleDriveConnector
from danswer.connectors.interfaces import BaseConnector
from danswer.connectors.interfaces import EventConnector
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import Document
from danswer.connectors.models import InputType
from danswer.connectors.slack.connector import SlackConnector
from danswer.connectors.web.connector import WebConnector

_NUM_SECONDS_IN_DAY = 86400


class ConnectorMissingException(Exception):
    pass


def build_connector(
    source: DocumentSource,
    input_type: InputType,
    connector_specific_config: dict[str, Any],
) -> BaseConnector:
    if source == DocumentSource.SLACK:
        connector: BaseConnector = SlackConnector(**connector_specific_config)
    elif source == DocumentSource.GOOGLE_DRIVE:
        connector = GoogleDriveConnector(**connector_specific_config)
    elif source == DocumentSource.GITHUB:
        connector = GithubConnector(**connector_specific_config)
    elif source == DocumentSource.WEB:
        connector = WebConnector(**connector_specific_config)
    elif source == DocumentSource.CONFLUENCE:
        connector = ConfluenceConnector(**connector_specific_config)
    else:
        raise ConnectorMissingException(f"Connector not found for source={source}")

    if any(
        [
            input_type == InputType.LOAD_STATE
            and not isinstance(connector, LoadConnector),
            input_type == InputType.POLL and not isinstance(connector, PollConnector),
            input_type == InputType.EVENT and not isinstance(connector, EventConnector),
        ]
    ):
        raise ConnectorMissingException(
            f"Connector for source={source} does not accept input_type={input_type}"
        )

    return connector


# TODO this is some jank, rework at some point
def _poll_to_load_connector(range_pull_connector: PollConnector) -> LoadConnector:
    class _Connector(LoadConnector):
        def __init__(self) -> None:
            self._connector = range_pull_connector

        def load_from_state(self) -> Generator[list[Document], None, None]:
            # adding some buffer to make sure we get all documents
            return self._connector.poll_source(0, time.time() + _NUM_SECONDS_IN_DAY)

    return _Connector()


# TODO this is some jank, rework at some point
def build_load_connector(
    source: DocumentSource, connector_specific_config: dict[str, Any]
) -> LoadConnector:
    connector = build_connector(source, InputType.LOAD_STATE, connector_specific_config)
    if isinstance(connector, PollConnector):
        return _poll_to_load_connector(connector)
    assert isinstance(connector, LoadConnector)
    return connector
