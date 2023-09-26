from typing import cast

from danswer.background.celery.celery_utils import get_celery_task
from danswer.background.celery.celery_utils import get_celery_task_status
from danswer.background.connector_deletion import get_cleanup_task_id
from danswer.db.models import DeletionStatus
from danswer.server.models import DeletionAttemptSnapshot


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
