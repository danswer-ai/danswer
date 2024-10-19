from typing import cast

from redis import Redis
from sqlalchemy.orm import Session

from ee.enmedd.db.teamspace import delete_teamspace
from ee.enmedd.db.teamspace import fetch_teamspace
from ee.enmedd.db.teamspace import mark_teamspace_as_synced
from enmedd.background.celery.celery_app import task_logger
from enmedd.background.celery.celery_redis import RedisTeamspace
from enmedd.utils.logger import setup_logger

logger = setup_logger()


def monitor_usergroup_taskset(key_bytes: bytes, r: Redis, db_session: Session) -> None:
    """This function is likely to move in the worker refactor happening next."""
    key = key_bytes.decode("utf-8")
    usergroup_id = RedisTeamspace.get_id_from_fence_key(key)
    if not usergroup_id:
        task_logger.warning("Could not parse usergroup id from {key}")
        return

    rug = RedisTeamspace(usergroup_id)
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
        f"User group sync progress: usergroup_id={usergroup_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    teamspace = fetch_teamspace(db_session=db_session, teamspace_id=usergroup_id)
    if teamspace:
        if teamspace.is_up_for_deletion:
            delete_teamspace(db_session=db_session, teamspace=teamspace)
            task_logger.info(f"Deleted usergroup. id='{usergroup_id}'")
        else:
            mark_teamspace_as_synced(db_session=db_session, teamspace=teamspace)
            task_logger.info(f"Synced usergroup. id='{usergroup_id}'")

    r.delete(rug.taskset_key)
    r.delete(rug.fence_key)
