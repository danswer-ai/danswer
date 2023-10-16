import json
from typing import cast

from celery.result import AsyncResult
from sqlalchemy import text
from sqlalchemy.orm import Session

from danswer.background.celery.celery import celery_app
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import DeletionStatus
from danswer.server.models import DeletionAttemptSnapshot


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
    # first check for any pending tasks
    with Session(get_sqlalchemy_engine()) as session:
        rows = session.execute(text("SELECT payload FROM kombu_message WHERE visible"))
        for row in rows:
            payload = json.loads(row[0])
            if payload["headers"]["id"] == task_id:
                return "PENDING"

    task = get_celery_task(task_id)
    # if not pending, then we know the task really exists
    if task.status != "PENDING":
        return task.status

    return None


def get_deletion_status(
    connector_id: int, credential_id: int
) -> DeletionAttemptSnapshot | None:
    cleanup_task_id = name_cc_cleanup_task(
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


def name_cc_cleanup_task(connector_id: int, credential_id: int) -> str:
    return f"cleanup_connector_credential_pair_{connector_id}_{credential_id}"


def name_document_set_sync_task(document_set_id: int) -> str:
    return f"sync_doc_set_{document_set_id}"
