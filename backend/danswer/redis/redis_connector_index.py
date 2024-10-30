from datetime import datetime
from typing import cast
from uuid import uuid4

import redis
from pydantic import BaseModel


class RedisConnectorIndexingFenceData(BaseModel):
    index_attempt_id: int | None
    started: datetime | None
    submitted: datetime
    celery_task_id: str | None


class RedisConnectorIndex:
    PREFIX = "connectorindexing"
    FENCE_PREFIX = f"{PREFIX}_fence"  # "connectorindexing_fence"
    GENERATOR_TASK_PREFIX = PREFIX + "+generator"  # "connectorindexing+generator_fence"
    GENERATOR_PROGRESS_PREFIX = (
        PREFIX + "_generator_progress"
    )  # connectorindexing_generator_progress
    GENERATOR_COMPLETE_PREFIX = (
        PREFIX + "_generator_complete"
    )  # connectorindexing_generator_complete

    GENERATOR_LOCK_PREFIX = "da_lock:indexing"

    def __init__(self, tenant_id: str | None, id: int, redis: redis.Redis) -> None:
        self.tenant_id: str | None = tenant_id
        self.id = id
        self.redis = redis

        self.partial_fence_key: str = f"{self.FENCE_PREFIX}_{id}"
        self.partial_generator_progress_key = f"{self.GENERATOR_PROGRESS_PREFIX}_{id}"
        self.partial_generator_complete_key = f"{self.GENERATOR_COMPLETE_PREFIX}_{id}"
        self.partial_generator_lock_key = f"{self.GENERATOR_LOCK_PREFIX}_{id}"

        self.partial_generator_task_key = f"{self.GENERATOR_TASK_PREFIX}_{id}"

    @classmethod
    def fence_key_with_ids(cls, cc_pair_id: int, search_settings_id: int) -> str:
        return f"{cls.FENCE_PREFIX}_{cc_pair_id}/{search_settings_id}"

    def fence_key(self, search_settings_id: int) -> str:
        return f"{self.partial_fence_key}/{search_settings_id}"

    def generator_progress_key(self, search_settings_id: int) -> str:
        return f"{self.partial_generator_progress_key}/{search_settings_id}"

    def generator_complete_key(self, search_settings_id: int) -> str:
        return f"{self.partial_generator_complete_key}/{search_settings_id}"

    def generator_lock_key(self, search_settings_id: int) -> str:
        return f"{self.partial_generator_lock_key}/{search_settings_id}"

    def generate_generator_task_id(self, search_settings_id: int) -> str:
        # celery's default task id format is "dd32ded3-00aa-4884-8b21-42f8332e7fac"
        # we prefix the task id so it's easier to keep track of who created the task
        # aka "connectorindexing+generator_1_6dd32ded3-00aa-4884-8b21-42f8332e7fac"

        return f"{self.partial_generator_task_key}/{search_settings_id}_{uuid4()}"

    def fenced(self, search_settings_id: int) -> bool:
        if self.redis.exists(self.fence_key(search_settings_id)):
            return True

        return False

    def payload(
        self, search_settings_id: int
    ) -> RedisConnectorIndexingFenceData | None:
        # read related data and evaluate/print task progress
        fence_bytes = cast(bytes, self.redis.get(self.fence_key(search_settings_id)))
        if fence_bytes is None:
            return None

        fence_str = fence_bytes.decode("utf-8")
        payload = RedisConnectorIndexingFenceData.model_validate_json(
            cast(str, fence_str)
        )

        return payload

    def set_fence(
        self,
        search_settings_id: int,
        payload: RedisConnectorIndexingFenceData | None,
    ) -> None:
        if not payload:
            self.redis.delete(self.fence_key(search_settings_id))
            return

        self.redis.set(self.fence_key(search_settings_id), payload.model_dump_json())

    def set_generator_complete(
        self, search_settings_id: int, payload: int | None
    ) -> None:
        if not payload:
            self.redis.delete(self.generator_complete_key(search_settings_id))
            return

        self.redis.set(self.generator_complete_key(search_settings_id), payload)

    def generator_clear(self, search_settings_id: int) -> None:
        self.redis.delete(self.generator_progress_key(search_settings_id))
        self.redis.delete(self.generator_complete_key(search_settings_id))

    def get_progress(self, search_settings_id: int) -> int | None:
        """Returns None if the key doesn't exist. The"""
        # TODO: move into fence?
        bytes = self.redis.get(self.generator_progress_key(search_settings_id))
        if bytes is None:
            return None

        progress = int(cast(int, bytes))
        return progress

    def get_completion(self, search_settings_id: int) -> int | None:
        # TODO: move into fence?
        bytes = self.redis.get(self.generator_complete_key(search_settings_id))
        if bytes is None:
            return None

        status = int(cast(int, bytes))
        return status

    def reset(self, search_settings_id: int) -> None:
        self.redis.delete(self.generator_lock_key(search_settings_id))
        self.redis.delete(self.generator_progress_key(search_settings_id))
        self.redis.delete(self.generator_complete_key(search_settings_id))
        self.redis.delete(self.fence_key(search_settings_id))

    @staticmethod
    def reset_all(r: redis.Redis) -> None:
        """Deletes all redis values for all connectors"""
        for key in r.scan_iter(RedisConnectorIndex.GENERATOR_LOCK_PREFIX + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnectorIndex.GENERATOR_COMPLETE_PREFIX + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnectorIndex.GENERATOR_PROGRESS_PREFIX + "*"):
            r.delete(key)

        for key in r.scan_iter(RedisConnectorIndex.FENCE_PREFIX + "*"):
            r.delete(key)
