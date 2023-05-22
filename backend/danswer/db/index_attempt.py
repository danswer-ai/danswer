from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = setup_logger()


def insert_index_attempt(db_session: Session, index_attempt: IndexAttempt) -> None:
    logger.info(f"Inserting {index_attempt}")
    db_session.add(index_attempt)
    db_session.commit()


def fetch_index_attempts(
    db_session: Session,
    sources: list[DocumentSource] | None = None,
    input_types: list[InputType] | None = None,
    statuses: list[IndexingStatus] | None = None,
) -> list[IndexAttempt]:
    stmt = select(IndexAttempt)
    if sources:
        stmt = stmt.where(IndexAttempt.connector.source.in_(sources))
    if input_types:
        stmt = stmt.where(IndexAttempt.connector.input_type.in_(input_types))
    if statuses:
        stmt = stmt.where(IndexAttempt.status.in_(statuses))
    results = db_session.scalars(stmt)
    return list(results.all())


def update_index_attempt(
    db_session: Session,
    index_attempt_id: int,
    new_status: IndexingStatus,
    document_ids: list[str] | None = None,
    error_msg: str | None = None,
) -> bool:
    """Returns `True` if successfully updated, `False` if cannot find matching ID"""
    stmt = select(IndexAttempt).where(IndexAttempt.id == index_attempt_id)
    result = db_session.scalar(stmt)
    if result:
        result.status = new_status
        result.document_ids = document_ids
        result.error_msg = error_msg
        db_session.commit()
        return True
    return False
