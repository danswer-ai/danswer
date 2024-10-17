from typing import cast

from redis import Redis
from sqlalchemy.orm import Session

from ee.enmedd.background.task_name_builders import name_chat_ttl_task
from ee.enmedd.background.task_name_builders import name_sync_external_permissions_task
from ee.enmedd.db.teamspace import delete_teamspace
from ee.enmedd.db.teamspace import fetch_teamspace
from ee.enmedd.db.teamspace import mark_teamspace_as_synced
from enmedd.background.celery.celery_app import task_logger
from enmedd.background.celery.celery_redis import RedisTeamspace
from enmedd.db.engine import get_sqlalchemy_engine
from enmedd.db.enums import AccessType
from enmedd.db.models import ConnectorCredentialPair
from enmedd.db.tasks import check_task_is_live_and_not_timed_out
from enmedd.db.tasks import get_latest_task
from enmedd.utils.logger import setup_logger

logger = setup_logger()


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


def monitor_teamspace_taskset(key_bytes: bytes, r: Redis) -> None:
    """This function is likely to move in the worker refactor happening next."""
    key = key_bytes.decode("utf-8")
    teamspace_id = RedisTeamspace.get_id_from_fence_key(key)
    if not teamspace_id:
        task_logger.warning("Could not parse teamspace id from {key}")
        return

    rug = RedisTeamspace(teamspace_id)
    fence_value = r.get(rug.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rug.taskset_key))
    task_logger.info(
        f"User group sync: teamspace_id={teamspace_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    with Session(get_sqlalchemy_engine()) as db_session:
        teamspace = fetch_teamspace(db_session=db_session, teamspace_id=teamspace_id)
        if teamspace:
            if teamspace.is_up_for_deletion:
                delete_teamspace(db_session=db_session, teamspace=teamspace)
                task_logger.info(f"Deleted teamspace. id='{teamspace_id}'")
            else:
                mark_teamspace_as_synced(db_session=db_session, teamspace=teamspace)
                task_logger.info(f"Synced teamspace. id='{teamspace_id}'")

    r.delete(rug.taskset_key)
    r.delete(rug.fence_key)
