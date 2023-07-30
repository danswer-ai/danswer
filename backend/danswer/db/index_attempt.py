from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logger import setup_logger


logger = setup_logger()


def create_index_attempt(
    connector_id: int,
    credential_id: int,
    db_session: Session,
) -> int:
    new_attempt = IndexAttempt(
        connector_id=connector_id,
        credential_id=credential_id,
        status=IndexingStatus.NOT_STARTED,
    )
    db_session.add(new_attempt)
    db_session.commit()

    return new_attempt.id


def get_inprogress_index_attempts(
    connector_id: int | None,
    db_session: Session,
) -> list[IndexAttempt]:
    stmt = select(IndexAttempt)
    if connector_id is not None:
        stmt = stmt.where(IndexAttempt.connector_id == connector_id)
    stmt = stmt.where(IndexAttempt.status == IndexingStatus.IN_PROGRESS)

    incomplete_attempts = db_session.scalars(stmt)
    return list(incomplete_attempts.all())


def get_not_started_index_attempts(db_session: Session) -> list[IndexAttempt]:
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.status == IndexingStatus.NOT_STARTED)
    new_attempts = db_session.scalars(stmt)
    return list(new_attempts.all())


def mark_attempt_in_progress(
    index_attempt: IndexAttempt,
    db_session: Session,
) -> None:
    index_attempt.status = IndexingStatus.IN_PROGRESS
    db_session.add(index_attempt)
    db_session.commit()


def mark_attempt_succeeded(
    index_attempt: IndexAttempt,
    db_session: Session,
) -> None:
    index_attempt.status = IndexingStatus.SUCCESS
    db_session.add(index_attempt)
    db_session.commit()


def mark_attempt_failed(
    index_attempt: IndexAttempt, db_session: Session, failure_reason: str = "Unknown"
) -> None:
    index_attempt.status = IndexingStatus.FAILED
    index_attempt.error_msg = failure_reason
    db_session.add(index_attempt)
    db_session.commit()


def get_last_successful_attempt(
    connector_id: int,
    credential_id: int,
    db_session: Session,
) -> IndexAttempt | None:
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.connector_id == connector_id)
    stmt = stmt.where(IndexAttempt.credential_id == credential_id)
    stmt = stmt.where(IndexAttempt.status == IndexingStatus.SUCCESS)
    # Note, the below is using time_created instead of time_updated
    stmt = stmt.order_by(desc(IndexAttempt.time_created))

    return db_session.execute(stmt).scalars().first()


def delete_index_attempts(
    connector_id: int,
    credential_id: int,
    db_session: Session,
) -> None:
    stmt = delete(IndexAttempt).where(
        IndexAttempt.connector_id == connector_id,
        IndexAttempt.credential_id == credential_id,
    )
    db_session.execute(stmt)
