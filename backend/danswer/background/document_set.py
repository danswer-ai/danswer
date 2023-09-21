from sqlalchemy.orm import Session

from danswer.background.celery.celery import sync_document_set_task
from danswer.background.celery.celery_utils import get_celery_task_status
from danswer.background.utils import interval_run_job
from danswer.db.document_set import (
    fetch_document_sets,
)
from danswer.db.engine import get_sqlalchemy_engine
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _get_task_id_for_document_set_id(document_set_id: int) -> str:
    return f"document_set_sync_task_{document_set_id}"


def _document_sync_loop():
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any document sets are not synced
        document_set_info = fetch_document_sets(db_session=db_session)
        for document_set, _ in document_set_info:
            if not document_set.is_up_to_date:
                task_id = _get_task_id_for_document_set_id(document_set.id)
                task_status = get_celery_task_status(task_id=task_id)
                if task_status == "PENDING" or task_status == "STARTED":
                    logger.info(
                        f"Document set '{document_set.id}' is already syncing. Skipping."
                    )
                    continue

                logger.info(
                    f"Document set {document_set.id} is not synced. Syncing now!"
                )
                sync_document_set_task.apply_async(
                    kwargs=dict(document_set_id=document_set.id),
                    task_id=task_id,
                )


if __name__ == "__main__":
    interval_run_job(
        job=_document_sync_loop, delay=5, emit_job_start_log=False
    )  # run every 5 seconds
