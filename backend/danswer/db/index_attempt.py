from collections.abc import Sequence

from sqlalchemy import and_
from sqlalchemy import ColumnElement
from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.utils.logger import setup_logger
from danswer.utils.telemetry import optional_telemetry
from danswer.utils.telemetry import RecordType

logger = setup_logger()


def get_index_attempt(
    db_session: Session, index_attempt_id: int
) -> IndexAttempt | None:
    stmt = select(IndexAttempt).where(IndexAttempt.id == index_attempt_id)
    return db_session.scalars(stmt).first()


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
    """This eagerly loads the connector and credential so that the db_session can be expired
    before running long-living indexing jobs, which causes increasing memory usage"""
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.status == IndexingStatus.NOT_STARTED)
    stmt = stmt.options(
        joinedload(IndexAttempt.connector), joinedload(IndexAttempt.credential)
    )
    new_attempts = db_session.scalars(stmt)
    return list(new_attempts.all())


def mark_attempt_in_progress(
    index_attempt: IndexAttempt,
    db_session: Session,
) -> None:
    index_attempt.status = IndexingStatus.IN_PROGRESS
    index_attempt.time_started = index_attempt.time_started or func.now()  # type: ignore
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

    source = index_attempt.connector.source
    optional_telemetry(record_type=RecordType.FAILURE, data={"connector": source})


def update_docs_indexed(
    db_session: Session,
    index_attempt: IndexAttempt,
    total_docs_indexed: int,
    new_docs_indexed: int,
) -> None:
    index_attempt.total_docs_indexed = total_docs_indexed
    index_attempt.new_docs_indexed = new_docs_indexed

    db_session.add(index_attempt)
    db_session.commit()


def get_last_attempt(
    connector_id: int,
    credential_id: int,
    db_session: Session,
) -> IndexAttempt | None:
    stmt = select(IndexAttempt)
    stmt = stmt.where(IndexAttempt.connector_id == connector_id)
    stmt = stmt.where(IndexAttempt.credential_id == credential_id)
    # Note, the below is using time_created instead of time_updated
    stmt = stmt.order_by(desc(IndexAttempt.time_created))

    return db_session.execute(stmt).scalars().first()


def get_latest_index_attempts(
    connector_credential_pair_identifiers: list[ConnectorCredentialPairIdentifier],
    db_session: Session,
) -> Sequence[IndexAttempt]:
    ids_stmt = select(
        IndexAttempt.connector_id,
        IndexAttempt.credential_id,
        func.max(IndexAttempt.time_created).label("max_time_created"),
    )

    where_stmts: list[ColumnElement] = []
    for connector_credential_pair_identifier in connector_credential_pair_identifiers:
        where_stmts.append(
            and_(
                IndexAttempt.connector_id
                == connector_credential_pair_identifier.connector_id,
                IndexAttempt.credential_id
                == connector_credential_pair_identifier.credential_id,
            )
        )
    if where_stmts:
        ids_stmt = ids_stmt.where(or_(*where_stmts))
    ids_stmt = ids_stmt.group_by(IndexAttempt.connector_id, IndexAttempt.credential_id)
    ids_subqery = ids_stmt.subquery()

    stmt = (
        select(IndexAttempt)
        .join(
            ids_subqery,
            and_(
                ids_subqery.c.connector_id == IndexAttempt.connector_id,
                ids_subqery.c.credential_id == IndexAttempt.credential_id,
            ),
        )
        .where(IndexAttempt.time_created == ids_subqery.c.max_time_created)
    )
    return db_session.execute(stmt).scalars().all()


def get_index_attempts_for_cc_pair(
    db_session: Session,
    cc_pair_identifier: ConnectorCredentialPairIdentifier,
    disinclude_finished: bool = False,
) -> Sequence[IndexAttempt]:
    stmt = select(IndexAttempt).where(
        and_(
            IndexAttempt.connector_id == cc_pair_identifier.connector_id,
            IndexAttempt.credential_id == cc_pair_identifier.credential_id,
        )
    )
    if disinclude_finished:
        stmt = stmt.where(
            IndexAttempt.status.in_(
                [IndexingStatus.NOT_STARTED, IndexingStatus.IN_PROGRESS]
            )
        )

    stmt = stmt.order_by(IndexAttempt.time_created.desc())
    return db_session.execute(stmt).scalars().all()


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
