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
    INDEXING = "connectorindexing"
    INDEXING_FENCE = INDEXING + "_fence"
    INDEXING_TASKSET = INDEXING + "_taskset"  # connectorindexing_taskset
    INDEXING_GENERATOR_PROGRESS = (
        INDEXING + "_generator_progress"
    )  # connectorindexing_generator_progress
    INDEXING_GENERATOR_COMPLETE = (
        INDEXING + "_generator_complete"
    )  # connectorindexing_generator_complete

    def __init__(self, tenant_id: str | None, id: int) -> None:
        self.tenant_id: str | None = tenant_id
        self.id: int = id
        self.redis: redis.Redis = get_redis_client(tenant_id=tenant_id)

        self.stop = self.RedisConnectorStop(tenant_id, id, self.redis)
        self.prune = self.RedisConnectorPrune(tenant_id, id, self.redis)
        self.delete = self.RedisConnectorDelete(tenant_id, id, self.redis)

    def is_indexing(self) -> bool:
        if self.redis.exists(self.get_indexing_fence_key()):
            return True

        return False

    def get_indexing_fence_key(self) -> str:
        return f"{self.INDEXING_FENCE}_{self.id}"

    @staticmethod
    def indexing_cleanup(r: redis.Redis) -> None:
        for key in r.scan_iter(RedisConnector.INDEXING_TASKSET + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnector.INDEXING_GENERATOR_COMPLETE + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnector.INDEXING_GENERATOR_PROGRESS + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnector.INDEXING_FENCE + "*"):
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

    class RedisConnectorStop:
        FENCE_PREFIX = "connectorstop_fence"

        def __init__(self, tenant_id: str | None, id: int, redis: redis.Redis) -> None:
            self.tenant_id: str | None = tenant_id
            self.id: int = id
            self.redis = redis

            self.fence_key: str = f"{self.FENCE_PREFIX}_{id}"

        @property
        def fenced(self) -> bool:
            if self.redis.exists(self.fence_key):
                return True

            return False

        def set_fence(self, value: bool) -> None:
            if not value:
                self.redis.delete(self.fence_key)
                return

            self.redis.set(self.fence_key, 0)

        @staticmethod
        def reset(r: redis.Redis) -> None:
            for key in r.scan_iter(
                RedisConnector.RedisConnectorStop.FENCE_PREFIX + "*"
            ):
                r.delete(key)

    class RedisConnectorPrune:
        PREFIX = "connectorpruning"

        FENCE_PREFIX = f"{PREFIX}_fence"

        # phase 1 - geneartor task and progress signals
        GENERATORTASK_PREFIX = f"{PREFIX}+generator"  # connectorpruning+generator
        GENERATOR_PROGRESS_PREFIX = (
            PREFIX + "_generator_progress"
        )  # connectorpruning_generator_progress
        GENERATOR_COMPLETE_PREFIX = (
            PREFIX + "_generator_complete"
        )  # connectorpruning_generator_complete

        TASKSET_PREFIX = f"{PREFIX}_taskset"  # connectorpruning_taskset
        SUBTASK_PREFIX = f"{PREFIX}+sub"  # connectorpruning+sub

        def __init__(self, tenant_id: str | None, id: int, redis: redis.Redis) -> None:
            self.tenant_id: str | None = tenant_id
            self.id = id
            self.redis = redis

            self.fence_key: str = f"{self.FENCE_PREFIX}_{id}"
            self.generator_task_key = f"{self.GENERATORTASK_PREFIX}_{id}"
            self.generator_progress = f"{self.GENERATOR_PROGRESS_PREFIX}_{id}"
            self.generator_complete_key = f"{self.GENERATOR_COMPLETE_PREFIX}_{id}"

            self.taskset_key = f"{self.TASKSET_PREFIX}_{id}"

            self.subtask_prefix: str = f"{self.SUBTASK_PREFIX}_{id}"

        def taskset_clear(self) -> None:
            self.redis.delete(self.taskset_key)

        def generator_clear(self) -> None:
            self.redis.delete(self.generator_progress)
            self.redis.delete(self.generator_complete_key)

        def get_remaining(self) -> int:
            # todo: move into fence
            remaining = cast(int, self.redis.scard(self.taskset_key))
            return remaining

        def get_active_task_count(self) -> int:
            """Count of active pruning tasks"""
            count = 0
            for key in self.redis.scan_iter(
                RedisConnector.RedisConnectorPrune.FENCE_PREFIX + "*"
            ):
                count += 1
            return count

        @property
        def fenced(self) -> bool:
            if self.redis.exists(self.fence_key):
                return True

            return False

        def set_fence(self, value: bool) -> None:
            if not value:
                self.redis.delete(self.fence_key)
                return

            self.redis.set(self.fence_key, 0)

        @property
        def generator_complete(self) -> int | None:
            """the fence payload is an int representing the starting number of
            pruning tasks to be processed ... just after the generator completes."""
            fence_bytes = self.redis.get(self.generator_complete_key)
            if fence_bytes is None:
                return None

            fence_int = cast(int, fence_bytes)
            return fence_int

        @generator_complete.setter
        def generator_complete(self, payload: int | None) -> None:
            """Set the payload to an int to set the fence, otherwise if None it will
            be deleted"""
            if payload is None:
                self.redis.delete(self.generator_complete_key)
                return

            self.redis.set(self.generator_complete_key, payload)

        def generate_tasks(
            self,
            documents_to_prune: set[str],
            celery_app: Celery,
            db_session: Session,
            lock: redis.lock.Lock | None,
        ) -> int | None:
            last_lock_time = time.monotonic()

            async_results = []
            cc_pair = get_connector_credential_pair_from_id(int(self.id), db_session)
            if not cc_pair:
                return None

            for doc_id in documents_to_prune:
                current_time = time.monotonic()
                if lock and current_time - last_lock_time >= (
                    CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT / 4
                ):
                    lock.reacquire()
                    last_lock_time = current_time

                # celery's default task id format is "dd32ded3-00aa-4884-8b21-42f8332e7fac"
                # the actual redis key is "celery-task-meta-dd32ded3-00aa-4884-8b21-42f8332e7fac"
                # we prefix the task id so it's easier to keep track of who created the task
                # aka "documentset_1_6dd32ded3-00aa-4884-8b21-42f8332e7fac"
                custom_task_id = f"{self.subtask_prefix}_{uuid4()}"

                # add to the tracking taskset in redis BEFORE creating the celery task.
                self.redis.sadd(self.taskset_key, custom_task_id)

                # Priority on sync's triggered by new indexing should be medium
                result = celery_app.send_task(
                    "document_by_cc_pair_cleanup_task",
                    kwargs=dict(
                        document_id=doc_id,
                        connector_id=cc_pair.connector_id,
                        credential_id=cc_pair.credential_id,
                        tenant_id=self.tenant_id,
                    ),
                    queue=DanswerCeleryQueues.CONNECTOR_DELETION,
                    task_id=custom_task_id,
                    priority=DanswerCeleryPriority.MEDIUM,
                )

                async_results.append(result)

            return len(async_results)

        @staticmethod
        def remove_from_taskset(id: int, task_id: str, r: redis.Redis) -> None:
            taskset_key = f"{RedisConnector.RedisConnectorPrune.TASKSET_PREFIX}_{id}"
            r.srem(taskset_key, task_id)
            return

        @staticmethod
        def reset(r: redis.Redis) -> None:
            """Deletes all redis values for all connectors"""
            for key in r.scan_iter(
                RedisConnector.RedisConnectorPrune.TASKSET_PREFIX + "*"
            ):
                r.delete(key)

            for key in r.scan_iter(
                RedisConnector.RedisConnectorPrune.GENERATOR_COMPLETE_PREFIX + "*"
            ):
                r.delete(key)

            for key in r.scan_iter(
                RedisConnector.RedisConnectorPrune.GENERATOR_PROGRESS_PREFIX + "*"
            ):
                r.delete(key)

            for key in r.scan_iter(
                RedisConnector.RedisConnectorPrune.FENCE_PREFIX + "*"
            ):
                r.delete(key)

    class RedisConnectorDelete:
        PREFIX = "connectordeletion"
        FENCE_PREFIX = f"{PREFIX}_fence"  # "connectordeletion_fence"
        TASKSET_PREFIX = f"{PREFIX}_taskset"  # "connectordeletion_taskset"

        def __init__(self, tenant_id: str | None, id: int, redis: redis.Redis) -> None:
            self.tenant_id: str | None = tenant_id
            self.id = id
            self.redis = redis

            self.fence_key: str = f"{self.FENCE_PREFIX}_{id}"
            self.taskset_key = f"{self.TASKSET_PREFIX}_{id}"

        def taskset_clear(self) -> None:
            self.redis.delete(self.taskset_key)

        def get_remaining(self) -> int:
            # todo: move into fence
            remaining = cast(int, self.redis.scard(self.taskset_key))
            return remaining

        def get_active_task_count(self) -> int:
            """Count of active pruning tasks"""
            count = 0
            for key in self.redis.scan_iter(
                RedisConnector.RedisConnectorPrune.FENCE_PREFIX + "*"
            ):
                count += 1
            return count

        @property
        def fenced(self) -> bool:
            if self.redis.exists(self.fence_key):
                return True

            return False

        @property
        def payload(self) -> RedisConnectorDeletionFenceData | None:
            # read related data and evaluate/print task progress
            fence_bytes = cast(bytes, self.redis.get(self.fence_key))
            if fence_bytes is None:
                return None

            fence_str = fence_bytes.decode("utf-8")
            payload = RedisConnectorDeletionFenceData.model_validate_json(
                cast(str, fence_str)
            )

            return payload

        def set_fence(self, payload: RedisConnectorDeletionFenceData | None) -> None:
            if not payload:
                self.redis.delete(self.fence_key)
                return

            self.redis.set(self.fence_key, payload.model_dump_json())

        def _generate_task_id(self) -> str:
            # celery's default task id format is "dd32ded3-00aa-4884-8b21-42f8332e7fac"
            # we prefix the task id so it's easier to keep track of who created the task
            # aka "connectordeletion_1_6dd32ded3-00aa-4884-8b21-42f8332e7fac"

            return f"{self.PREFIX}_{self.id}_{uuid4()}"

        def generate_tasks(
            self,
            celery_app: Celery,
            db_session: Session,
            lock: redis.lock.Lock,
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

                custom_task_id = self._generate_task_id()

                # add to the tracking taskset in redis BEFORE creating the celery task.
                # note that for the moment we are using a single taskset key, not differentiated by cc_pair id
                self.redis.sadd(self.taskset_key, custom_task_id)

                # Priority on sync's triggered by new indexing should be medium
                result = celery_app.send_task(
                    "document_by_cc_pair_cleanup_task",
                    kwargs=dict(
                        document_id=doc.id,
                        connector_id=cc_pair.connector_id,
                        credential_id=cc_pair.credential_id,
                        tenant_id=self.tenant_id,
                    ),
                    queue=DanswerCeleryQueues.CONNECTOR_DELETION,
                    task_id=custom_task_id,
                    priority=DanswerCeleryPriority.MEDIUM,
                )

                async_results.append(result)

            return len(async_results)

        @staticmethod
        def remove_from_taskset(id: int, task_id: str, r: redis.Redis) -> None:
            taskset_key = f"{RedisConnector.RedisConnectorDelete.TASKSET_PREFIX}_{id}"
            r.srem(taskset_key, task_id)
            return

        @staticmethod
        def reset(r: redis.Redis) -> None:
            """Deletes all redis values for all connectors"""
            for key in r.scan_iter(
                RedisConnector.RedisConnectorDelete.TASKSET_PREFIX + "*"
            ):
                r.delete(key)

            for key in r.scan_iter(
                RedisConnector.RedisConnectorDelete.FENCE_PREFIX + "*"
            ):
                r.delete(key)
