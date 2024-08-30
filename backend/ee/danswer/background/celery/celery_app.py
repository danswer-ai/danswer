from datetime import timedelta

from celery.exceptions import SoftTimeLimitExceeded
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_app import RedisUserGroup
from danswer.background.task_utils import build_celery_task_wrapper
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerRedisLocks
from danswer.db.chat import delete_chat_sessions_older_than
from danswer.db.engine import get_sqlalchemy_engine
from danswer.redis.redis_pool import RedisPool
from danswer.server.settings.store import load_settings
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import global_version
from ee.danswer.background.celery_utils import should_perform_chat_ttl_check
from ee.danswer.background.task_name_builders import name_chat_ttl_task
from ee.danswer.db.user_group import fetch_user_groups
from ee.danswer.server.reporting.usage_export_generation import create_new_usage_report

logger = setup_logger()

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)

redis_pool = RedisPool()

# mark as EE for all tasks in this file
global_version.set_ee()


@build_celery_task_wrapper(name_chat_ttl_task)
@celery_app.task(soft_time_limit=JOB_TIMEOUT)
def perform_ttl_management_task(retention_limit_days: int) -> None:
    with Session(get_sqlalchemy_engine()) as db_session:
        delete_chat_sessions_older_than(retention_limit_days, db_session)


#####
# Periodic Tasks
#####


@celery_app.task(
    name="check_ttl_management_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_ttl_management_task() -> None:
    """Runs periodically to check if any ttl tasks should be run and adds them
    to the queue"""
    settings = load_settings()
    retention_limit_days = settings.maximum_chat_retention_days
    with Session(get_sqlalchemy_engine()) as db_session:
        if should_perform_chat_ttl_check(retention_limit_days, db_session):
            perform_ttl_management_task.apply_async(
                kwargs=dict(retention_limit_days=retention_limit_days),
            )


@celery_app.task(
    name="check_for_vespa_user_groups_sync_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_vespa_user_groups_sync_task() -> None:
    """Runs periodically to check if any user groups need syncing.
    Generates sets of tasks for Celery if syncing is needed."""

    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            # check if any user groups are not synced
            user_groups = fetch_user_groups(db_session=db_session, only_current=False)
            for usergroup in user_groups:
                lock_beat.reacquire()

                if usergroup.is_up_to_date:
                    continue

                rug = RedisUserGroup(usergroup.id)

                # don't generate sync tasks if tasks are still pending
                if r.exists(rug.fence_key):
                    continue

                # add tasks to celery and build up the task set to monitor in redis
                r.delete(rug.taskset_key)

                # Add all documents that need to be updated into the queue
                task_logger.info(
                    f"generate_tasks starting. usergroup_id={usergroup.id}"
                )
                tasks_generated = rug.generate_tasks(
                    celery_app, db_session, r, lock_beat
                )
                if tasks_generated and tasks_generated > 0:
                    task_logger.info(
                        f"generate_tasks finished. "
                        f"usergroup_id={usergroup.id} tasks_generated={tasks_generated}"
                    )

                    # set this only after all tasks have been added
                    r.set(rug.fence_key, tasks_generated)
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Generic exception.")
    finally:
        if lock_beat.owned():
            lock_beat.release()


@celery_app.task(
    name="autogenerate_usage_report_task",
    soft_time_limit=JOB_TIMEOUT,
)
def autogenerate_usage_report_task() -> None:
    """This generates usage report under the /admin/generate-usage/report endpoint"""
    with Session(get_sqlalchemy_engine()) as db_session:
        create_new_usage_report(
            db_session=db_session,
            user_id=None,
            period=None,
        )


#####
# Celery Beat (Periodic Tasks) Settings
#####
celery_app.conf.beat_schedule = {
    "check-for-user-group-sync": {
        "task": "check_for_vespa_user_groups_sync_task",
        "schedule": timedelta(seconds=5),
        "options": {"priority": DanswerCeleryPriority.HIGH},
    },
    "autogenerate-usage-report": {
        "task": "autogenerate_usage_report_task",
        "schedule": timedelta(days=30),  # TODO: change this to config flag
    },
    "check-ttl-management": {
        "task": "check_ttl_management_task",
        "schedule": timedelta(hours=1),
    },
    **(celery_app.conf.beat_schedule or {}),
}
