import json
from typing import cast

from celery import Celery
from celery.result import AsyncResult
from sqlalchemy import text
from sqlalchemy.orm import Session

from danswer.background.connector_deletion import cleanup_connector_credential_pair
from danswer.background.connector_deletion import get_cleanup_task_id
from danswer.db.engine import build_connection_string
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.engine import SYNC_DB_API
from danswer.db.models import DeletionStatus
from danswer.server.models import DeletionAttemptSnapshot

celery_broker_url = "sqla+" + build_connection_string(db_api=SYNC_DB_API)
celery_backend_url = "db+" + build_connection_string(db_api=SYNC_DB_API)
celery_app = Celery(__name__, broker=celery_broker_url, backend=celery_backend_url)


@celery_app.task(soft_time_limit=60 * 60 * 6)  # 6 hour time limit
def cleanup_connector_credential_pair_task(
    connector_id: int, credential_id: int
) -> int:
    return cleanup_connector_credential_pair(connector_id, credential_id)


def get_deletion_status(
    connector_id: int, credential_id: int
) -> DeletionAttemptSnapshot | None:
    cleanup_task_id = get_cleanup_task_id(
        connector_id=connector_id, credential_id=credential_id
    )
    deletion_task = get_celery_task(task_id=cleanup_task_id)
    deletion_task_status = get_celery_task_status(task_id=cleanup_task_id)

    deletion_status = None
    error_msg = None
    num_docs_deleted = 0
    if deletion_task_status == "SUCCESS":
        deletion_status = DeletionStatus.SUCCESS
        num_docs_deleted = cast(int, deletion_task.get(propagate=False))
    elif deletion_task_status == "FAILURE":
        deletion_status = DeletionStatus.FAILED
        error_msg = deletion_task.get(propagate=False)
    elif deletion_task_status == "STARTED" or deletion_task_status == "PENDING":
        deletion_status = DeletionStatus.IN_PROGRESS

    return (
        DeletionAttemptSnapshot(
            connector_id=connector_id,
            credential_id=credential_id,
            status=deletion_status,
            error_msg=str(error_msg),
            num_docs_deleted=num_docs_deleted,
        )
        if deletion_status
        else None
    )


def get_celery_task(task_id: str) -> AsyncResult:
    """NOTE: even if the task doesn't exist, celery will still return something
    with a `PENDING` state"""
    return AsyncResult(task_id, backend=celery_app.backend)


def get_celery_task_status(task_id: str) -> str | None:
    """NOTE: is tightly coupled to the internals of kombu (which is the
    translation layer to allow us to use Postgres as a broker). If we change
    the broker, this will need to be updated.

    This should not be called on any critical flows.
    """
    task = get_celery_task(task_id)
    # if not pending, then we know the task really exists
    if task.status != "PENDING":
        return task.status

    with Session(get_sqlalchemy_engine()) as session:
        rows = session.execute(text("SELECT payload FROM kombu_message WHERE visible"))
        for row in rows:
            payload = json.loads(row[0])
            if payload["headers"]["id"] == task_id:
                return "PENDING"

    return None
