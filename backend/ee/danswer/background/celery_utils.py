from sqlalchemy.orm import Session

from danswer.db.enums import AccessType
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import UserGroup
from danswer.db.tasks import check_task_is_live_and_not_timed_out
from danswer.db.tasks import get_latest_task
from danswer.utils.logger import setup_logger
from ee.danswer.background.task_name_builders import name_chat_ttl_task
from ee.danswer.background.task_name_builders import name_sync_external_permissions_task
from ee.danswer.background.task_name_builders import name_user_group_sync_task

logger = setup_logger()


def should_sync_user_groups(user_group: UserGroup, db_session: Session) -> bool:
    if user_group.is_up_to_date:
        return False
    task_name = name_user_group_sync_task(user_group.id)
    latest_sync = get_latest_task(task_name, db_session)

    if latest_sync and check_task_is_live_and_not_timed_out(latest_sync, db_session):
        logger.debug(f"{task_name} is already being performed. Skipping.")
        return False
    return True


def should_perform_chat_ttl_check(
    retention_limit_days: int | None, db_session: Session
) -> bool:
    # TODO: make this a check for None and add behavior for 0 day TTL
    if not retention_limit_days:
        return False

    task_name = name_chat_ttl_task(retention_limit_days)
    latest_task = get_latest_task(task_name, db_session)
    if not latest_task:
        return True

    if latest_task and check_task_is_live_and_not_timed_out(latest_task, db_session):
        logger.debug(f"{task_name} is already being performed. Skipping.")
        return False
    return True


def should_perform_external_permissions_check(
    cc_pair: ConnectorCredentialPair, db_session: Session
) -> bool:
    if cc_pair.access_type != AccessType.SYNC:
        return False

    task_name = name_sync_external_permissions_task(cc_pair_id=cc_pair.id)

    latest_task = get_latest_task(task_name, db_session)
    if not latest_task:
        return True

    if check_task_is_live_and_not_timed_out(latest_task, db_session):
        logger.debug(f"{task_name} is already being performed. Skipping.")
        return False

    return True
