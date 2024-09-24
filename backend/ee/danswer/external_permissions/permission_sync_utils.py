from datetime import datetime
from datetime import timezone
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import InputType
from danswer.db.models import ConnectorCredentialPair
from danswer.utils.logger import setup_logger


# None means that the connector supports polling from last_time_perm_sync to now
_FULL_FETCH_PERIOD_IN_SECONDS: dict[DocumentSource, int | None] = {
    # Polling is supported
    DocumentSource.GOOGLE_DRIVE: None,
    # Polling is not supported so we fetch all doc permissions every 30 minutes
    DocumentSource.CONFLUENCE: 30 * 60,
}

logger = setup_logger()


class DocsWithAdditionalInfo(BaseModel):
    id: str
    additional_info: Any


def get_docs_with_additional_info(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> list[DocsWithAdditionalInfo]:
    # If the source type is not polling, we only fetch the permissions every
    # _FULL_FETCH_PERIOD_IN_SECONDS seconds
    full_fetch_period = _FULL_FETCH_PERIOD_IN_SECONDS[cc_pair.connector.source]
    if full_fetch_period is not None:
        last_sync = cc_pair.last_time_perm_sync
        if (
            last_sync
            and (
                datetime.now(timezone.utc) - last_sync.replace(tzinfo=timezone.utc)
            ).total_seconds()
            < full_fetch_period
        ):
            return []

    # Get all document ids that need their permissions updated
    runnable_connector = instantiate_connector(
        db_session=db_session,
        source=cc_pair.connector.source,
        input_type=InputType.POLL,
        connector_specific_config=cc_pair.connector.connector_specific_config,
        credential=cc_pair.credential,
    )

    assert isinstance(runnable_connector, PollConnector)

    current_time = datetime.now(timezone.utc)
    start_time = (
        cc_pair.last_time_perm_sync.replace(tzinfo=timezone.utc).timestamp()
        if cc_pair.last_time_perm_sync and full_fetch_period is None
        else 0.0
    )
    cc_pair.last_time_perm_sync = current_time

    doc_batch_generator = runnable_connector.poll_source(
        start=start_time, end=current_time.timestamp()
    )

    docs_with_additional_info = [
        DocsWithAdditionalInfo(id=doc.id, additional_info=doc.additional_info)
        for doc_batch in doc_batch_generator
        for doc in doc_batch
    ]

    return docs_with_additional_info
