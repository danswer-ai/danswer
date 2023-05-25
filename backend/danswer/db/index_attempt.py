from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logging import setup_logger
from sqlalchemy import desc
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


def get_incomplete_index_attempts_from_connector(
    connector_id: int,
    db_session: Session,
) -> list[IndexAttempt]:
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.connector_id == connector_id)
    stmt = stmt.where(
        IndexAttempt.status.notin_([IndexingStatus.SUCCESS, IndexingStatus.FAILED])
    )

    incomplete_attempts = db_session.scalars(stmt)
    return list(incomplete_attempts.all())


def mark_attempt_failed(
    index_attempts: list[IndexAttempt],
    db_session: Session,
) -> None:
    for attempt in index_attempts:
        attempt.status = IndexingStatus.FAILED
        db_session.add(attempt)
        db_session.commit()


def get_last_finished_attempt(
    connector_id: int,
    db_session: Session,
) -> IndexAttempt | None:
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.connector_id == connector_id)
    stmt = stmt.where(IndexAttempt.status == IndexingStatus.SUCCESS)
    stmt = stmt.order_by(desc(IndexAttempt.time_updated))

    return db_session.execute(stmt).scalars().first()
