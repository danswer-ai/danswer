from datetime import timedelta
from typing import Any

from onyx.configs.constants import OnyxCeleryPriority
from onyx.configs.constants import OnyxCeleryTask


tasks_to_schedule = [
    {
        "name": "check-for-vespa-sync",
        "task": OnyxCeleryTask.CHECK_FOR_VESPA_SYNC_TASK,
        "schedule": timedelta(seconds=20),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "check-for-connector-deletion",
        "task": OnyxCeleryTask.CHECK_FOR_CONNECTOR_DELETION,
        "schedule": timedelta(seconds=20),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "check-for-indexing",
        "task": OnyxCeleryTask.CHECK_FOR_INDEXING,
        "schedule": timedelta(seconds=15),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "check-for-prune",
        "task": OnyxCeleryTask.CHECK_FOR_PRUNING,
        "schedule": timedelta(seconds=15),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "kombu-message-cleanup",
        "task": OnyxCeleryTask.KOMBU_MESSAGE_CLEANUP_TASK,
        "schedule": timedelta(seconds=3600),
        "options": {"priority": OnyxCeleryPriority.LOWEST},
    },
    {
        "name": "monitor-vespa-sync",
        "task": OnyxCeleryTask.MONITOR_VESPA_SYNC,
        "schedule": timedelta(seconds=5),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "check-for-doc-permissions-sync",
        "task": OnyxCeleryTask.CHECK_FOR_DOC_PERMISSIONS_SYNC,
        "schedule": timedelta(seconds=30),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
    {
        "name": "check-for-external-group-sync",
        "task": OnyxCeleryTask.CHECK_FOR_EXTERNAL_GROUP_SYNC,
        "schedule": timedelta(seconds=20),
        "options": {"priority": OnyxCeleryPriority.HIGH},
    },
]


def get_tasks_to_schedule() -> list[dict[str, Any]]:
    return tasks_to_schedule
