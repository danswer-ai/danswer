from datetime import timedelta

from sqlalchemy.orm import Session

from ee.enmedd.background.celery_utils import should_perform_chat_ttl_check
from ee.enmedd.background.celery_utils import should_sync_teamspaces
from ee.enmedd.background.task_name_builders import name_chat_ttl_task
from ee.enmedd.background.task_name_builders import name_teamspace_sync_task
from ee.enmedd.db.teamspace import fetch_teamspaces
from ee.enmedd.server.reporting.usage_export_generation import create_new_usage_report
from ee.enmedd.teamspaces.sync import sync_teamspaces
from enmedd.background.celery.celery_app import celery_app
from enmedd.background.task_utils import build_celery_task_wrapper
from enmedd.configs.app_configs import JOB_TIMEOUT
from enmedd.db.chat import delete_chat_sessions_older_than
from enmedd.db.engine import get_sqlalchemy_engine
from enmedd.server.settings.store import load_settings
from enmedd.utils.logger import setup_logger
from enmedd.utils.variable_functionality import global_version

logger = setup_logger()

# mark as EE for all tasks in this file
global_version.set_ee()


@build_celery_task_wrapper(name_teamspace_sync_task)
@celery_app.task(soft_time_limit=JOB_TIMEOUT)
def sync_teamspace_task(teamspace_id: int) -> None:
    with Session(get_sqlalchemy_engine()) as db_session:
        # actual sync logic
        try:
            sync_teamspaces(teamspace_id=teamspace_id, db_session=db_session)
        except Exception as e:
            logger.exception(f"Failed to sync teamspace - {e}")


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
    name="check_for_teamspaces_sync_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_teamspaces_sync_task() -> None:
    """Runs periodically to check if any teamspaces are out of sync
    Creates a task to sync the teamspace if needed"""
    with Session(get_sqlalchemy_engine()) as db_session:
        # check if any document sets are not synced
        teamspaces = fetch_teamspaces(db_session=db_session, only_current=False)
        for teamspace in teamspaces:
            if should_sync_teamspaces(teamspace, db_session):
                logger.info(f"Teamspace {teamspace.id} is not synced. Syncing now!")
                sync_teamspace_task.apply_async(
                    kwargs=dict(teamspace_id=teamspace.id),
                )


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
    "check-for-teamspace-sync": {
        "task": "check_for_teamspaces_sync_task",
        "schedule": timedelta(seconds=5),
    },
    "autogenerate_usage_report": {
        "task": "autogenerate_usage_report_task",
        "schedule": timedelta(days=30),  # TODO: change this to config flag
    },
    "check-ttl-management": {
        "task": "check_ttl_management_task",
        "schedule": timedelta(hours=1),
    },
    **(celery_app.conf.beat_schedule or {}),
}
