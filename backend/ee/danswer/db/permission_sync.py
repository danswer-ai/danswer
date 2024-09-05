from datetime import timedelta

from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.db.models import PermissionSyncJobType
from danswer.db.models import PermissionSyncRun
from danswer.db.models import PermissionSyncStatus
from danswer.utils.logger import setup_logger

logger = setup_logger()


def mark_all_inprogress_permission_sync_failed(
    db_session: Session,
) -> None:
    stmt = (
        update(PermissionSyncRun)
        .where(PermissionSyncRun.status == PermissionSyncStatus.IN_PROGRESS)
        .values(status=PermissionSyncStatus.FAILED)
    )
    db_session.execute(stmt)
    db_session.commit()


def get_perm_sync_attempt(attempt_id: int, db_session: Session) -> PermissionSyncRun:
    stmt = select(PermissionSyncRun).where(PermissionSyncRun.id == attempt_id)
    try:
        return db_session.scalars(stmt).one()
    except NoResultFound:
        raise ValueError(f"No PermissionSyncRun found with id {attempt_id}")


def expire_perm_sync_timed_out(
    timeout_hours: int,
    db_session: Session,
) -> None:
    cutoff_time = func.now() - timedelta(hours=timeout_hours)

    update_stmt = (
        update(PermissionSyncRun)
        .where(
            PermissionSyncRun.status == PermissionSyncStatus.IN_PROGRESS,
            PermissionSyncRun.start_time < cutoff_time,
        )
        .values(status=PermissionSyncStatus.FAILED, error_msg="timed out")
    )

    db_session.execute(update_stmt)
    db_session.commit()


def create_perm_sync(
    source_type: DocumentSource,
    sync_type: PermissionSyncJobType,
    db_session: Session,
) -> PermissionSyncRun:
    new_run = PermissionSyncRun(
        source_type=source_type,
        update_type=sync_type,
        status=PermissionSyncStatus.IN_PROGRESS,
    )

    db_session.add(new_run)
    db_session.commit()

    return new_run


def get_last_sync_attempt(
    source_type: DocumentSource,
    job_type: PermissionSyncJobType,
    db_session: Session,
    success_only: bool = False,
) -> PermissionSyncRun | None:
    stmt = select(PermissionSyncRun).where(
        PermissionSyncRun.source_type == source_type,
        PermissionSyncRun.update_type == job_type,
    )
    if success_only:
        stmt = stmt.where(PermissionSyncRun.status == PermissionSyncStatus.SUCCESS)

    stmt = stmt.order_by(desc(PermissionSyncRun.start_time))

    return db_session.execute(stmt).scalars().first()
