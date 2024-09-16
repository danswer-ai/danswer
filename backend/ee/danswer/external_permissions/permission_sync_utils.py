from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.connectors.factory import instantiate_connector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.models import InputType
from danswer.db.models import ConnectorCredentialPair


class DocsWithAdditionalInfo(BaseModel):
    id: str
    additional_info: Any


def fetch_docs_with_additional_info(
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

    # TODO: Find a way to do this without running the connector to
    # retrieve every single document
    doc_batch_generator = runnable_connector.poll_source(
        start=0.0, end=datetime.now().timestamp()
    )

    docs_with_additional_info: list[DocsWithAdditionalInfo] = []
    for doc_batch in doc_batch_generator:
        for doc in doc_batch:
            docs_with_additional_info.append(
                DocsWithAdditionalInfo(
                    id=doc.id,
                    additional_info=doc.additional_info,
                )
            )

    return docs_with_additional_info
