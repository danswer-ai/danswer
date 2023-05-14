from danswer.configs.constants import DocumentSource
from danswer.connectors.models import InputType
from danswer.db.engine import build_engine
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = setup_logger()


def insert_index_attempt(index_attempt: IndexAttempt) -> None:
    logger.info(f"Inserting {index_attempt}")
    with Session(build_engine()) as session:
        session.add(index_attempt)
        session.commit()


def fetch_index_attempts(
    *,
    sources: list[DocumentSource] | None = None,
    statuses: list[IndexingStatus] | None = None,
    input_types: list[InputType] | None = None,
) -> list[IndexAttempt]:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(IndexAttempt)
        if sources:
            stmt = stmt.where(IndexAttempt.source.in_(sources))
        if statuses:
            stmt = stmt.where(IndexAttempt.status.in_(statuses))
        if input_types:
            stmt = stmt.where(IndexAttempt.input_type.in_(input_types))
        results = session.scalars(stmt)
        return list(results.all())


def update_index_attempt(
    *,
    index_attempt_id: int,
    new_status: IndexingStatus,
    document_ids: list[str] | None = None,
    error_msg: str | None = None,
) -> bool:
    """Returns `True` if successfully updated, `False` if cannot find matching ID"""
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        stmt = select(IndexAttempt).where(IndexAttempt.id == index_attempt_id)
        result = session.scalar(stmt)
        if result:
            result.status = new_status
            result.document_ids = document_ids
            result.error_msg = error_msg
            session.commit()
            return True
        return False
