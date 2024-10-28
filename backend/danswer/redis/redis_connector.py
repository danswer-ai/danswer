import time
from datetime import datetime
from typing import cast
from uuid import uuid4

import redis
from celery import Celery
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerCeleryQueues
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.document import construct_document_select_for_connector_credential_pair
from danswer.redis.redis_pool import get_redis_client


class RedisConnectorDeletionFenceData(BaseModel):
    num_tasks: int | None
    submitted: datetime


class RedisConnector:
    PRUNING = "connectorpruning"
    PRUNING_FENCE = PRUNING + "_fence"

    INDEXING = "connectorindexing"
    INDEXING_FENCE = INDEXING + "_fence"

    DELETION = "connectordeletion"
    DELETION_FENCE = DELETION + "_fence"  # connectordeletion_fence
    DELETION_TASKSET = DELETION + "_taskset"  # connectordeletion_taskset

    STOP_FENCE = "connectorstop_fence"

    def __init__(self, tenant_id: str | None, id: int) -> None:
        self.tenant_id: str | None = tenant_id
        self.id: int = id
        self.redis: redis.Redis = get_redis_client(tenant_id=tenant_id)

    def is_indexing(self) -> bool:
        if self.redis.exists(self.get_indexing_fence_key()):
            return True

        return False

    # def is_pruning(self) -> bool:
    #     if self.redis.exists(self.fence_key):
    #         return True

    #     return False

    def is_deleting(self) -> bool:
        if self.redis.exists(self.get_deletion_fence_key()):
            return True

        return False

    def is_stopping(self) -> bool:
        if self.redis.exists(self.get_stop_fence_key()):
            return True

        return False

    def get_indexing_fence_key(self) -> str:
        return f"{self.INDEXING_FENCE}_{self.id}"

    def get_stop_fence_key(self) -> str:
        return f"{self.STOP_FENCE}_{self.id}"

    def get_deletion_fence_key(self) -> str:
        return f"{self.DELETION_FENCE}_{self.id}"

    def _get_deletion_taskset_key(self) -> str:
        return f"{self.DELETION_TASKSET}_{self.id}"

    def _get_deletion_task_id(self) -> str:
        # celery's default task id format is "dd32ded3-00aa-4884-8b21-42f8332e7fac"
        # we prefix the task id so it's easier to keep track of who created the task
        # aka "connectordeletion_1_6dd32ded3-00aa-4884-8b21-42f8332e7fac"

        return f"{self.DELETION}_{self.id}_{uuid4()}"

    def deletion_generate_tasks(
        self,
        celery_app: Celery,
        db_session: Session,
        lock: redis.lock.Lock,
        tenant_id: str | None,
    ) -> int | None:
        """Returns None if the cc_pair doesn't exist.
        Otherwise, returns an int with the number of generated tasks."""
        last_lock_time = time.monotonic()

        async_results = []
        cc_pair = get_connector_credential_pair_from_id(int(self.id), db_session)
        if not cc_pair:
            return None

        stmt = construct_document_select_for_connector_credential_pair(
            cc_pair.connector_id, cc_pair.credential_id
        )
        for doc in db_session.scalars(stmt).yield_per(1):
            current_time = time.monotonic()
            if current_time - last_lock_time >= (
                CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT / 4
            ):
                lock.reacquire()
                last_lock_time = current_time

            custom_task_id = self._get_deletion_task_id()

            # add to the tracking taskset in redis BEFORE creating the celery task.
            # note that for the moment we are using a single taskset key, not differentiated by cc_pair id
            self.redis.sadd(self._get_deletion_taskset_key(), custom_task_id)

            # Priority on sync's triggered by new indexing should be medium
            result = celery_app.send_task(
                "document_by_cc_pair_cleanup_task",
                kwargs=dict(
                    document_id=doc.id,
                    connector_id=cc_pair.connector_id,
                    credential_id=cc_pair.credential_id,
                    tenant_id=tenant_id,
                ),
                queue=DanswerCeleryQueues.CONNECTOR_DELETION,
                task_id=custom_task_id,
                priority=DanswerCeleryPriority.MEDIUM,
            )

            async_results.append(result)

        return len(async_results)

    def deletion_fence_set(self, fence_value: str) -> None:
        self.redis.set(self.get_deletion_fence_key(), fence_value)
        return

    def deletion_fence_clear(self) -> None:
        self.redis.delete(self.get_deletion_fence_key())
        return

    def deletion_fence_read(self) -> RedisConnectorDeletionFenceData:
        # read related data and evaluate/print task progress
        fence_value = cast(bytes, self.redis.get(self.get_deletion_fence_key()))
        if fence_value is None:
            return

        fence_json = fence_value.decode("utf-8")
        fence_data = RedisConnectorDeletionFenceData.model_validate_json(
            cast(str, fence_json)
        )

        return fence_data

    def deletion_taskset_clear(self) -> None:
        self.redis.delete(self._get_deletion_taskset_key())
        return

    def deletion_get_remaining(self) -> int:
        remaining = cast(int, self.redis.scard(self._get_deletion_taskset_key()))
        return remaining

    def stop_fence_set(self, fence_value: int) -> None:
        self.redis.set(self.get_stop_fence_key(), fence_value)
        return

    def stop_fence_clear(self) -> None:
        self.redis.delete(self.get_stop_fence_key())
        return

    @staticmethod
    def deletion_taskset_remove(id: int, task_id: str, r: redis.Redis) -> None:
        taskset_key = f"{RedisConnector.DELETION_TASKSET}_{id}"
        r.srem(taskset_key, task_id)
        return

    @staticmethod
    def deletion_cleanup(r: redis.Redis) -> None:
        for key in r.scan_iter(RedisConnector.DELETION_TASKSET + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnector.DELETION_FENCE + "*"):
            r.delete(key)

    @staticmethod
    def stop_cleanup(r: redis.Redis) -> None:
        for key in r.scan_iter(RedisConnector.STOP_FENCE + "*"):
            r.delete(key)

    @staticmethod
    def get_id_from_fence_key(key: str) -> str | None:
        """
        Extracts the object ID from a fence key in the format `PREFIX_fence_X`.

        Args:
            key (str): The fence key string.

        Returns:
            Optional[int]: The extracted ID if the key is in the correct format, otherwise None.
        """
        parts = key.split("_")
        if len(parts) != 3:
            return None

        object_id = parts[2]
        return object_id

    @staticmethod
    def get_id_from_task_id(task_id: str) -> str | None:
        """
        Extracts the object ID from a task ID string.

        This method assumes the task ID is formatted as `prefix_objectid_suffix`, where:
        - `prefix` is an arbitrary string (e.g., the name of the task or entity),
        - `objectid` is the ID you want to extract,
        - `suffix` is another arbitrary string (e.g., a UUID).

        Example:
            If the input `task_id` is `documentset_1_cbfdc96a-80ca-4312-a242-0bb68da3c1dc`,
            this method will return the string `"1"`.

        Args:
            task_id (str): The task ID string from which to extract the object ID.

        Returns:
            str | None: The extracted object ID if the task ID is in the correct format, otherwise None.
        """
        # example: task_id=documentset_1_cbfdc96a-80ca-4312-a242-0bb68da3c1dc
        parts = task_id.split("_")
        if len(parts) != 3:
            return None

        object_id = parts[1]
        return object_id
