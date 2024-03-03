from datetime import timedelta

from sqlalchemy.orm import Session

from danswer.background.celery.celery import celery_app
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.tasks import check_live_task_not_timed_out
from danswer.db.tasks import get_latest_task
from danswer.db.tasks import mark_task_finished
from danswer.db.tasks import mark_task_start
from danswer.db.tasks import register_task
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import global_version
from ee.danswer.background.user_group_sync import name_user_group_sync_task
from ee.danswer.db.user_group import fetch_user_groups
from ee.danswer.user_groups.sync import sync_user_groups

logger = setup_logger()

# mark as EE for all tasks in this file
global_version.set_ee()


@celery_app.task(soft_time_limit=JOB_TIMEOUT)
def sync_user_group_task(user_group_id: int) -> None:
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        task_name = name_user_group_sync_task(user_group_id)
        mark_task_start(task_name, db_session)

        # actual sync logic
        error_msg = None
        try:
            sync_user_groups(user_group_id=user_group_id, db_session=db_session)
        except Exception as e:
            error_msg = str(e)
            logger.exception(f"Failed to sync user group - {error_msg}")

    # need a new session so this can be committed (previous transaction may have
    # been rolled back due to the exception)
    with Session(engine) as db_session:
        mark_task_finished(task_name, db_session, success=error_msg is None)


#####
# Periodic Tasks
#####
@celery_app.task(
    name="check_for_user_groups_sync_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_user_groups_sync_task() -> None:
    """Runs periodically to check if any user groups are out of sync
    Creates a task to sync the user group if needed"""
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any document sets are not synced
        user_groups = fetch_user_groups(db_session=db_session, only_current=False)
        for user_group in user_groups:
            if not user_group.is_up_to_date:
                task_name = name_user_group_sync_task(user_group.id)
                latest_sync = get_latest_task(task_name, db_session)

                if latest_sync and check_live_task_not_timed_out(
                    latest_sync, db_session
                ):
                    logger.info(
                        f"User Group '{user_group.id}' is already syncing. Skipping."
                    )
                    continue

                logger.info(f"User Group {user_group.id} is not synced. Syncing now!")
                task = sync_user_group_task.apply_async(
                    kwargs=dict(user_group_id=user_group.id),
                )
                register_task(task.id, task_name, db_session)


#####
# Celery Beat (Periodic Tasks) Settings
#####
celery_app.conf.beat_schedule = {
    "check-for-user-group-sync": {
        "task": "check_for_user_groups_sync_task",
        "schedule": timedelta(seconds=5),
    },
    **(celery_app.conf.beat_schedule or {}),
}
