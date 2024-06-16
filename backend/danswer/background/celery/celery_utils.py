from sqlalchemy.orm import Session

from danswer.background.task_utils import name_cc_cleanup_task
from danswer.background.task_utils import name_document_set_sync_task
from danswer.db.models import DocumentSet
from danswer.db.tasks import check_live_task_not_timed_out
from danswer.db.tasks import get_latest_task
from danswer.server.documents.models import DeletionAttemptSnapshot
from danswer.utils.logger import setup_logger

logger = setup_logger()


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


def should_sync_doc_set(document_set: DocumentSet, db_session: Session) -> bool:
    if document_set.is_up_to_date:
        return False

    task_name = name_document_set_sync_task(document_set.id)
    latest_sync = get_latest_task(task_name, db_session)

    if latest_sync and check_live_task_not_timed_out(latest_sync, db_session):
        logger.info(f"Document set '{document_set.id}' is already syncing. Skipping.")
        return False

    logger.info(f"Document set {document_set.id} syncing now!")
    return True
