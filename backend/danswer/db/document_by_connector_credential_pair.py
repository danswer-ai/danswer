from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import DocumentByConnectorCredentialPair
from danswer.utils.logger import setup_logger

logger = setup_logger()


def get_document_connector_credential_pair_by_document_id(
    document_id: str,
    db_session: Session,
) -> DocumentByConnectorCredentialPair | None:
    stmt = select(DocumentByConnectorCredentialPair)
    stmt = stmt.where(DocumentByConnectorCredentialPair.id == document_id)
    return db_session.scalars(stmt).first()
