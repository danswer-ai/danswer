from datetime import datetime
from datetime import timezone
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import InputType
from danswer.db.models import ConnectorCredentialPair
from danswer.utils.logger import setup_logger

logger = setup_logger()


class DocsWithAdditionalInfo(BaseModel):
    id: str
    additional_info: Any


def get_docs_with_additional_info(
    db_session: Session,
    cc_pair: ConnectorCredentialPair,
) -> list[DocsWithAdditionalInfo]:
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
        if cc_pair.last_time_perm_sync
        else 0
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
    logger.debug(f"Docs with additional info: {len(docs_with_additional_info)}")

    return docs_with_additional_info
