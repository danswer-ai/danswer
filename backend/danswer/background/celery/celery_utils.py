from sqlalchemy.orm import Session

from danswer.background.task_utils import name_cc_cleanup_task
from danswer.db.tasks import get_latest_task
from danswer.server.documents.models import DeletionAttemptSnapshot


def get_deletion_status(
    connector_id: int, credential_id: int, db_session: Session
) -> DeletionAttemptSnapshot | None:
    cleanup_task_name = name_cc_cleanup_task(
        connector_id=connector_id, credential_id=credential_id
    )
    task_state = get_latest_task(task_name=cleanup_task_name, db_session=db_session)

    if not task_state:
        return None

    return DeletionAttemptSnapshot(
        connector_id=connector_id,
        credential_id=credential_id,
        status=task_state.status,
    )
