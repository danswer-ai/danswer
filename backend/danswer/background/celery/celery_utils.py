from sqlalchemy.orm import Session

from danswer.background.task_utils import name_cc_cleanup_task
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.tasks import get_latest_task
from danswer.server.models import DeletionAttemptSnapshot


def get_deletion_status(
    connector_id: int, credential_id: int
) -> DeletionAttemptSnapshot | None:
    cleanup_task_name = name_cc_cleanup_task(
        connector_id=connector_id, credential_id=credential_id
    )

    with Session(get_sqlalchemy_engine()) as session:
        task_state = get_latest_task(task_name=cleanup_task_name, db_session=session)

    if not task_state:
        return None

    return DeletionAttemptSnapshot(
        connector_id=connector_id,
        credential_id=credential_id,
        status=task_state.status,
    )
