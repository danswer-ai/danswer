from datetime import timedelta
from typing import Any

from celery import Celery
from celery import signals
from celery.beat import PersistentScheduler  # type: ignore
from celery.signals import beat_init

import danswer.background.celery.apps.app_base as app_base
from danswer.configs.constants import POSTGRES_CELERY_BEAT_APP_NAME
from danswer.db.engine import get_all_tenant_ids
from danswer.db.engine import SqlEngine
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import fetch_versioned_implementation

logger = setup_logger(__name__)

celery_app = Celery(__name__)
celery_app.config_from_object("danswer.background.celery.configs.beat")


class DynamicTenantScheduler(PersistentScheduler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        logger.info("Initializing DynamicTenantScheduler")
        super().__init__(*args, **kwargs)
        self._reload_interval = timedelta(minutes=0.1)
        self._last_reload = self.app.now() - self._reload_interval
        # self._update_tenant_tasks()
        logger.info(f"Set reload interval to {self._reload_interval}")

    def setup_schedule(self) -> None:
        logger.info("Setting up initial schedule")
        super().setup_schedule()
        logger.info("Initial schedule setup complete")

    def tick(self) -> float:
        logger.info("Tick started")
        retval = super().tick()
        now = self.app.now()
        if (
            self._last_reload is None
            or (now - self._last_reload) > self._reload_interval
        ):
            logger.info("Reload interval reached, initiating tenant task update")
            self._update_tenant_tasks()
            self._last_reload = now
            logger.info("Tenant task update completed, reset reload timer")
        return retval

    def _update_tenant_tasks(self) -> None:
        logger.info("Starting tenant task update process")
        try:
            logger.info("Fetching all tenant IDs")
            tenant_ids = get_all_tenant_ids()
            logger.info(f"Found {len(tenant_ids)} tenants")

            logger.info("Fetching tasks to schedule")
            tasks_to_schedule = fetch_versioned_implementation(
                "danswer.background.celery.tasks.beat_schedule", "get_tasks_to_schedule"
            )

            new_beat_schedule: dict[str, dict[str, Any]] = {}

            store = getattr(self, "_store", None)
            current_schedule = store.get("entries", {}) if store is not None else {}

            existing_tenants = set()
            for task_name in current_schedule.keys():
                if "-" in task_name:
                    existing_tenants.add(task_name.split("-")[-1])
            logger.info(f"Found {len(existing_tenants)} existing tenants in schedule")

            for tenant_id in tenant_ids:
                if tenant_id not in existing_tenants:
                    logger.info(f"Processing new tenant: {tenant_id}")

                for task in tasks_to_schedule():
                    task_name = f"{task['name']}-{tenant_id}"
                    logger.debug(f"Creating task configuration for {task_name}")
                    new_task = {
                        "task": task["task"],
                        "schedule": task["schedule"],
                        "kwargs": {"tenant_id": tenant_id},
                    }
                    if options := task.get("options"):
                        logger.debug(f"Adding options to task {task_name}: {options}")
                        new_task["options"] = options
                    new_beat_schedule[task_name] = new_task

            if self._should_update_schedule(current_schedule, new_beat_schedule):
                logger.info(
                    "Schedule update required",
                    extra={
                        "new_tasks": len(new_beat_schedule),
                        "current_tasks": len(current_schedule),
                    },
                )
                if not hasattr(self, "_store"):
                    logger.info("Initializing store for first time")
                    self._store: dict[str, dict] = {"entries": {}}
                logger.info("Applying schedule updates")
                logger.info(f"New schedule: {new_beat_schedule}")

                logger.info("Schedule update completed successfully")
            else:
                logger.info("Schedule is up to date, no changes needed")

        except (AttributeError, KeyError) as e:
            logger.exception(f"Failed to process task configuration: {str(e)}")
        except Exception as e:
            logger.exception(f"Unexpected error updating tenant tasks: {str(e)}")

    def _should_update_schedule(
        self, current_schedule: dict, new_schedule: dict
    ) -> bool:
        """Compare schedules to determine if an update is needed."""
        logger.debug("Comparing current and new schedules")
        current_tasks = set(current_schedule.keys())
        new_tasks = set(new_schedule.keys())
        needs_update = current_tasks != new_tasks
        logger.debug(f"Schedule update needed: {needs_update}")
        return needs_update


@beat_init.connect
def on_beat_init(sender: Any, **kwargs: Any) -> None:
    logger.info("beat_init signal received.")

    # Celery beat shouldn't touch the db at all. But just setting a low minimum here.
    SqlEngine.set_app_name(POSTGRES_CELERY_BEAT_APP_NAME)
    SqlEngine.init_engine(pool_size=2, max_overflow=0)
    app_base.wait_for_redis(sender, **kwargs)


@signals.setup_logging.connect
def on_setup_logging(
    loglevel: Any, logfile: Any, format: Any, colorize: Any, **kwargs: Any
) -> None:
    app_base.on_setup_logging(loglevel, logfile, format, colorize, **kwargs)


celery_app.conf.beat_scheduler = DynamicTenantScheduler
