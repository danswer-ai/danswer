from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import DeletionAttempt
from danswer.db.models import DeletionStatus
from danswer.db.models import IndexingStatus


def check_deletion_attempt_is_allowed(
    connector_credential_pair: ConnectorCredentialPair,
) -> bool:
    """
    To be deletable:
        (1) connector should be disabled
        (2) there should be no in-progress/planned index attempts
    """
    return bool(
        connector_credential_pair.connector.disabled
        and (
            connector_credential_pair.last_attempt_status != IndexingStatus.IN_PROGRESS
            and connector_credential_pair.last_attempt_status
            != IndexingStatus.NOT_STARTED
        )
    )


def create_deletion_attempt(
    connector_id: int,
    credential_id: int,
    db_session: Session,
) -> int:
    new_attempt = DeletionAttempt(
        connector_id=connector_id,
        credential_id=credential_id,
        status=DeletionStatus.NOT_STARTED,
    )
    db_session.add(new_attempt)
    db_session.commit()

    return new_attempt.id


def get_not_started_index_attempts(db_session: Session) -> list[DeletionAttempt]:
    stmt = select(DeletionAttempt).where(
        DeletionAttempt.status == DeletionStatus.NOT_STARTED
    )
    not_started_deletion_attempts = db_session.scalars(stmt)
    return list(not_started_deletion_attempts.all())


def get_deletion_attempts(
    db_session: Session,
    connector_ids: list[int] | None = None,
    statuses: list[DeletionStatus] | None = None,
    ordered_by_time_updated: bool = False,
    limit: int | None = None,
) -> list[DeletionAttempt]:
    stmt = select(DeletionAttempt)
    if connector_ids:
        stmt = stmt.where(DeletionAttempt.connector_id.in_(connector_ids))
    if statuses:
        stmt = stmt.where(DeletionAttempt.status.in_(statuses))
    if ordered_by_time_updated:
        stmt = stmt.order_by(desc(DeletionAttempt.time_updated))
    if limit:
        stmt = stmt.limit(limit)

    deletion_attempts = db_session.scalars(stmt)
    return list(deletion_attempts.all())


def delete_deletion_attempts(
    db_session: Session, connector_id: int, credential_id: int
) -> None:
    stmt = delete(DeletionAttempt).where(
        and_(
            DeletionAttempt.connector_id == connector_id,
            DeletionAttempt.credential_id == credential_id,
        )
    )
    db_session.execute(stmt)
