from datetime import datetime
from typing import cast
from uuid import uuid4

import redis
from pydantic import BaseModel

from danswer.redis.redis_connector_utils import RedisConnectorUtils


class RedisConnectorIndexIdentifiers(BaseModel):
    cc_pair_id: int
    search_settings_id: int


class RedisConnectorIndexPayload(BaseModel):
    index_attempt_id: int | None
    started: datetime | None
    submitted: datetime
    celery_task_id: str | None


class RedisConnectorIndex:
    """Manages interactions with redis for indexing tasks. Should only be accessed
    through RedisConnector."""

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

    TERMINATE_PREFIX = PREFIX + "_terminate"  # connectorindexing_terminate

    def __init__(
        self,
        tenant_id: str | None,
        id: int,
        search_settings_id: int,
        redis: redis.Redis,
    ) -> None:
        self.tenant_id: str | None = tenant_id
        self.id = id
        self.search_settings_id = search_settings_id
        self.redis = redis

        self.fence_key: str = f"{self.FENCE_PREFIX}_{id}/{search_settings_id}"
        self.generator_progress_key = (
            f"{self.GENERATOR_PROGRESS_PREFIX}_{id}/{search_settings_id}"
        )
        self.generator_complete_key = (
            f"{self.GENERATOR_COMPLETE_PREFIX}_{id}/{search_settings_id}"
        )
        self.generator_lock_key = (
            f"{self.GENERATOR_LOCK_PREFIX}_{id}/{search_settings_id}"
        )
        self.terminate_key = f"{self.TERMINATE_PREFIX}_{id}/{search_settings_id}"

    @classmethod
    def fence_key_with_ids(cls, cc_pair_id: int, search_settings_id: int) -> str:
        return f"{cls.FENCE_PREFIX}_{cc_pair_id}/{search_settings_id}"

    def generate_generator_task_id(self) -> str:
        # celery's default task id format is "dd32ded3-00aa-4884-8b21-42f8332e7fac"
        # we prefix the task id so it's easier to keep track of who created the task
        # aka "connectorindexing+generator_1_6dd32ded3-00aa-4884-8b21-42f8332e7fac"

        return f"{self.GENERATOR_TASK_PREFIX}_{self.id}/{self.search_settings_id}_{uuid4()}"

    @property
    def fenced(self) -> bool:
        if self.redis.exists(self.fence_key):
            return True

        return False

    @property
    def payload(self) -> RedisConnectorIndexPayload | None:
        # read related data and evaluate/print task progress
        fence_bytes = cast(bytes, self.redis.get(self.fence_key))
        if fence_bytes is None:
            return None

        fence_str = fence_bytes.decode("utf-8")
        payload = RedisConnectorIndexPayload.model_validate_json(cast(str, fence_str))

        return payload

    def set_fence(
        self,
        payload: RedisConnectorIndexPayload | None,
    ) -> None:
        if not payload:
            self.redis.delete(self.fence_key)
            return

        self.redis.set(self.fence_key, payload.model_dump_json())

    def terminating(self, celery_task_id: str) -> bool:
        if self.redis.exists(f"{self.terminate_key}_{celery_task_id}"):
            return True

        return False

    def set_terminate(self, celery_task_id: str) -> None:
        """This sets a signal. It does not block!"""
        # We shouldn't need very long to terminate the spawned task.
        # 10 minute TTL is good.
        self.redis.set(f"{self.terminate_key}_{celery_task_id}", 0, ex=600)

    def set_generator_complete(self, payload: int | None) -> None:
        if not payload:
            self.redis.delete(self.generator_complete_key)
            return

        self.redis.set(self.generator_complete_key, payload)

    def generator_clear(self) -> None:
        self.redis.delete(self.generator_progress_key)
        self.redis.delete(self.generator_complete_key)

    def get_progress(self) -> int | None:
        """Returns None if the key doesn't exist. Returns an int representing
        the number of documents processed otherwise."""
        # TODO: move into fence?
        bytes = self.redis.get(self.generator_progress_key)
        if bytes is None:
            return None

        progress = int(cast(int, bytes))
        return progress

    def get_completion(self) -> int | None:
        # TODO: move into fence?
        bytes = self.redis.get(self.generator_complete_key)
        if bytes is None:
            return None

        status = int(cast(int, bytes))
        return status

    def reset(self) -> None:
        self.redis.delete(self.generator_lock_key)
        self.redis.delete(self.generator_progress_key)
        self.redis.delete(self.generator_complete_key)
        self.redis.delete(self.fence_key)

    @staticmethod
    def parse_key(key_bytes: bytes) -> RedisConnectorIndexIdentifiers | None:
        """Parses the redis key for an indexing job and extracts
        the cc_pair_id and search_settings_id"""
        fence_key = key_bytes.decode("utf-8")
        composite_id = RedisConnectorUtils.get_id_from_fence_key(fence_key)
        if composite_id is None:
            return None

        # parse out metadata and initialize the helper class with it
        parts = composite_id.split("/")
        if len(parts) != 2:
            return None

        cc_pair_id = int(parts[0])
        search_settings_id = int(parts[1])
        return RedisConnectorIndexIdentifiers(
            cc_pair_id=cc_pair_id, search_settings_id=search_settings_id
        )

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
