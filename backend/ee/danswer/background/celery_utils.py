from typing import cast

from redis import Redis
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import task_logger
from danswer.background.celery.celery_redis import RedisUserGroup
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.tasks import check_task_is_live_and_not_timed_out
from danswer.db.tasks import get_latest_task
from danswer.utils.logger import setup_logger
from ee.danswer.background.task_name_builders import name_chat_ttl_task
from ee.danswer.db.user_group import delete_user_group
from ee.danswer.db.user_group import fetch_user_group
from ee.danswer.db.user_group import mark_user_group_as_synced

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
        logger.info("TTL check is already being performed. Skipping.")
        return False
    return True


def monitor_usergroup_taskset(key_bytes: bytes, r: Redis) -> None:
    """This function is likely to move in the worker refactor happening next."""
    key = key_bytes.decode("utf-8")
    usergroup_id = RedisUserGroup.get_id_from_fence_key(key)
    if not usergroup_id:
        task_logger.warning("Could not parse usergroup id from {key}")
        return

    rug = RedisUserGroup(usergroup_id)
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
        f"User group sync: usergroup_id={usergroup_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    with Session(get_sqlalchemy_engine()) as db_session:
        user_group = fetch_user_group(db_session=db_session, user_group_id=usergroup_id)
        if user_group:
            if user_group.is_up_for_deletion:
                delete_user_group(db_session=db_session, user_group=user_group)
                task_logger.info(f"Deleted usergroup. id='{usergroup_id}'")
            else:
                mark_user_group_as_synced(db_session=db_session, user_group=user_group)
                task_logger.info(f"Synced usergroup. id='{usergroup_id}'")

    r.delete(rug.taskset_key)
    r.delete(rug.fence_key)
