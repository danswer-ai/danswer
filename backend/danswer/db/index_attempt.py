from danswer.configs.constants import DocumentSource
from danswer.db.engine import build_async_engine
from danswer.db.models import IndexAttempt
from danswer.db.models import IndexingStatus
from danswer.utils.logging import setup_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = setup_logger()


async def insert_index_attempt(index_attempt: IndexAttempt) -> None:
    logger.info(f"Inserting {index_attempt}")
    async with AsyncSession(build_async_engine()) as asession:
        asession.add(index_attempt)
        await asession.commit()


async def fetch_index_attempts(
    *,
    sources: list[DocumentSource] | None = None,
    statuses: list[IndexingStatus] | None = None,
) -> list[IndexAttempt]:
    async with AsyncSession(
        build_async_engine(), future=True, expire_on_commit=False
    ) as asession:
        stmt = select(IndexAttempt)
        if sources:
            stmt = stmt.where(IndexAttempt.source.in_(sources))
        if statuses:
            stmt = stmt.where(IndexAttempt.status.in_(statuses))
        results = await asession.scalars(stmt)
        return list(results.all())


async def update_index_attempt(
    *,
    index_attempt_id: int,
    new_status: IndexingStatus,
    document_ids: list[str] | None = None,
    error_msg: str | None = None,
) -> bool:
    """Returns `True` if successfully updated, `False` if cannot find matching ID"""
    async with AsyncSession(
        build_async_engine(), future=True, expire_on_commit=False
    ) as asession:
        stmt = select(IndexAttempt).where(IndexAttempt.id == index_attempt_id)
        result = await asession.scalar(stmt)
        if result:
            result.status = new_status
            result.document_ids = document_ids
            result.error_msg = error_msg
            await asession.commit()
            return True
        return False
