from datetime import timedelta
from typing import Any

from celery.beat import PersistentScheduler
from celery.utils.log import get_task_logger

from danswer.db.engine import get_all_tenant_ids
from danswer.utils.variable_functionality import fetch_versioned_implementation


logger = get_task_logger(__name__)


class DynamicTenantScheduler(PersistentScheduler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super(DynamicTenantScheduler, self).__init__(*args, **kwargs)
        self._last_reload = self.app.now()
        self._reload_interval = timedelta(minutes=1)
        self._update_tenant_tasks()

    def setup_schedule(self) -> None:
        super(DynamicTenantScheduler, self).setup_schedule()

    def tick(self) -> float:
        retval = super(DynamicTenantScheduler, self).tick()
        now = self.app.now()
        if (
            self._last_reload is None
            or (now - self._last_reload) > self._reload_interval
        ):
            logger.info("Reloading schedule to check for new tenants...")
            self._update_tenant_tasks()
            self._last_reload = now
        return retval

    def _update_tenant_tasks(self) -> None:
        logger.info("Checking for tenant task updates...")
        try:
            tenant_ids = get_all_tenant_ids()
            tasks_to_schedule = fetch_versioned_implementation(
                "danswer.background.celery.tasks.tasks", "get_tasks_to_schedule"
            )

            new_beat_schedule = {}

            for tenant_id in tenant_ids:
                for task in tasks_to_schedule():
                    task_name = f"{task['name']}-{tenant_id}"
                    task = {
                        "task": task["task"],
                        "schedule": task["schedule"],
                        "kwargs": {"tenant_id": tenant_id},
                    }
                    if task.get("options"):
                        task["options"] = task["options"]
                    new_beat_schedule[task_name] = task

            # Get current schedule
            current_schedule = getattr(self, "_store", {"entries": {}}).get(
                "entries", {}
            )

            # Compare schedules (converting to sets of task names for easy comparison)
            current_tasks = set(current_schedule.keys())
            new_tasks = set(new_beat_schedule.keys())

            if current_tasks != new_tasks:
                logger.info("Changes detected in tenant tasks, updating schedule...")
                if not hasattr(self, "_store"):
                    self._store = {"entries": {}}
                self.update_from_dict(new_beat_schedule)
                logger.info("Tenant tasks updated.")
            else:
                logger.debug("No changes in tenant tasks detected.")
        except Exception as e:
            logger.exception("Failed to update tenant tasks: %s", e)
