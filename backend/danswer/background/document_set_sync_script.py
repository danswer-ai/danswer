from celery.result import AsyncResult
from sqlalchemy.orm import Session

from danswer.background.celery.celery import sync_document_set_task
from danswer.background.utils import interval_run_job
from danswer.db.document_set import (
    fetch_document_sets,
)
from danswer.db.engine import get_sqlalchemy_engine
from danswer.utils.logger import setup_logger

logger = setup_logger()


_ExistingTaskCache: dict[int, AsyncResult] = {}


def _document_sync_loop() -> None:
    # cleanup tasks
    existing_tasks = list(_ExistingTaskCache.items())
    for document_set_id, task in existing_tasks:
        if task.ready():
            logger.info(
                f"Document set '{document_set_id}' is complete with status "
                f"{task.status}. Cleaning up."
            )
            del _ExistingTaskCache[document_set_id]

    # kick off new tasks
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any document sets are not synced
        document_set_info = fetch_document_sets(db_session=db_session)
        for document_set, _ in document_set_info:
            if not document_set.is_up_to_date:
                if document_set.id in _ExistingTaskCache:
                    logger.info(
                        f"Document set '{document_set.id}' is already syncing. Skipping."
                    )
                    continue

                logger.info(
                    f"Document set {document_set.id} is not synced. Syncing now!"
                )
                task = sync_document_set_task.apply_async(
                    kwargs=dict(document_set_id=document_set.id),
                )
                _ExistingTaskCache[document_set.id] = task


if __name__ == "__main__":
    interval_run_job(
        job=_document_sync_loop, delay=5, emit_job_start_log=False
    )  # run every 5 seconds
