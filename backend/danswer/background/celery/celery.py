from celery import Celery

from danswer.background.connector_deletion import cleanup_connector_credential_pair
from danswer.db.engine import build_connection_string
from danswer.db.engine import SYNC_DB_API
from danswer.document_set.document_set import sync_document_set
from danswer.utils.logger import setup_logger

logger = setup_logger()

celery_broker_url = "sqla+" + build_connection_string(db_api=SYNC_DB_API)
celery_backend_url = "db+" + build_connection_string(db_api=SYNC_DB_API)
celery_app = Celery(__name__, broker=celery_broker_url, backend=celery_backend_url)


@celery_app.task(soft_time_limit=60 * 60 * 6)  # 6 hour time limit
def cleanup_connector_credential_pair_task(
    connector_id: int, credential_id: int
) -> int:
    return cleanup_connector_credential_pair(connector_id, credential_id)


@celery_app.task(soft_time_limit=60 * 60 * 6)  # 6 hour time limit
def sync_document_set_task(document_set_id: int) -> None:
    try:
        return sync_document_set(document_set_id=document_set_id)
    except Exception:
        logger.exception("Failed to sync document set %s", document_set_id)
        raise
