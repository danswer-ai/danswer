from typing import Any

from danswer.configs.constants import DocumentSource
from danswer.connectors.github.batch import BatchGithubLoader
from danswer.connectors.google_drive.batch import BatchGoogleDriveLoader
from danswer.connectors.interfaces import PullLoader
from danswer.connectors.interfaces import RangePullLoader
from danswer.connectors.models import InputType
from danswer.connectors.slack.batch import BatchSlackLoader
from danswer.connectors.slack.pull import PeriodicSlackLoader
from danswer.connectors.web.pull import WebLoader


class ConnectorMissingException(Exception):
    pass


def build_connector(
    source: DocumentSource,
    input_type: InputType,
    connector_specific_config: dict[str, Any],
) -> PullLoader | RangePullLoader:
    if source == DocumentSource.SLACK:
        if input_type == InputType.PULL:
            return PeriodicSlackLoader(**connector_specific_config)
        if input_type == InputType.LOAD_STATE:
            return BatchSlackLoader(**connector_specific_config)
    elif source == DocumentSource.GOOGLE_DRIVE:
        if input_type == InputType.PULL:
            return BatchGoogleDriveLoader(**connector_specific_config)
    elif source == DocumentSource.GITHUB:
        if input_type == InputType.PULL:
            return BatchGithubLoader(**connector_specific_config)
    elif source == DocumentSource.WEB:
        if input_type == InputType.PULL:
            return WebLoader(**connector_specific_config)

    raise ConnectorMissingException(
        f"Connector not found for source={source}, input_type={input_type}"
    )
