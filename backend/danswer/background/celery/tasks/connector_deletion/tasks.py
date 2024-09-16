from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import cleanup_connector_credential_pair_task
from danswer.background.celery.celery_utils import _get_deletion_status
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.models import ConnectorCredentialPair
from danswer.db.tasks import check_task_is_live_and_not_timed_out

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)


@shared_task(
    name="check_for_cc_pair_deletion_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_cc_pair_deletion_task() -> None:
    """Runs periodically to check if any deletion tasks should be run"""
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any cc pairs are up for deletion
        cc_pairs = get_connector_credential_pairs(db_session)
        for cc_pair in cc_pairs:
            if should_kick_off_deletion_of_cc_pair(cc_pair, db_session):
                task_logger.info(
                    f"Deleting the {cc_pair.name} connector credential pair"
                )

                cleanup_connector_credential_pair_task.apply_async(
                    kwargs=dict(
                        connector_id=cc_pair.connector.id,
                        credential_id=cc_pair.credential.id,
                    ),
                )


def should_kick_off_deletion_of_cc_pair(
    cc_pair: ConnectorCredentialPair, db_session: Session
) -> bool:
    if cc_pair.status != ConnectorCredentialPairStatus.DELETING:
        return False

    if check_deletion_attempt_is_allowed(cc_pair, db_session):
        return False

    deletion_task = _get_deletion_status(
        connector_id=cc_pair.connector_id,
        credential_id=cc_pair.credential_id,
        db_session=db_session,
    )
    if deletion_task and check_task_is_live_and_not_timed_out(
        deletion_task,
        db_session,
        # 1 hour timeout
        timeout=60 * 60,
    ):
        return False

    return True
