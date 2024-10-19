import json
from collections.abc import Iterator
from contextlib import contextmanager
from typing import cast

from sqlalchemy.orm import Session

from enmedd.db.engine import get_session_factory
from enmedd.db.models import KVStore
from enmedd.key_value_store.interface import JSON_ro
from enmedd.key_value_store.interface import KeyValueStore
from enmedd.key_value_store.interface import KvKeyNotFoundError
from enmedd.redis.redis_pool import get_redis_client
from enmedd.utils.logger import setup_logger

logger = setup_logger()


REDIS_KEY_PREFIX = "enmedd_kv_store:"
KV_REDIS_KEY_EXPIRATION = 60 * 60 * 24  # 1 Day


class PgRedisKVStore(KeyValueStore):
    def __init__(self) -> None:
        self.redis_client = get_redis_client()

    @contextmanager
    def get_session(self) -> Iterator[Session]:
        factory = get_session_factory()
        session: Session = factory()
        try:
            yield session
        finally:
            session.close()

    def store(self, key: str, val: JSON_ro, encrypt: bool = False) -> None:
        # Not encrypted in Redis, but encrypted in Postgres
        try:
            self.redis_client.set(
                REDIS_KEY_PREFIX + key, json.dumps(val), ex=KV_REDIS_KEY_EXPIRATION
            )
        except Exception as e:
            # Fallback gracefully to Postgres if Redis fails
            logger.error(f"Failed to set value in Redis for key '{key}': {str(e)}")

        encrypted_val = val if encrypt else None
        plain_val = val if not encrypt else None
        with self.get_session() as session:
            obj = session.query(KVStore).filter_by(key=key).first()
            if obj:
                obj.value = plain_val
                obj.encrypted_value = encrypted_val
            else:
                obj = KVStore(
                    key=key, value=plain_val, encrypted_value=encrypted_val
                )  # type: ignore
                session.query(KVStore).filter_by(key=key).delete()  # just in case
                session.add(obj)
            session.commit()

    def load(self, key: str) -> JSON_ro:
        try:
            redis_value = self.redis_client.get(REDIS_KEY_PREFIX + key)
            if redis_value:
                assert isinstance(redis_value, bytes)
                return json.loads(redis_value.decode("utf-8"))
        except Exception as e:
            logger.error(f"Failed to get value from Redis for key '{key}': {str(e)}")

        with self.get_session() as session:
            obj = session.query(KVStore).filter_by(key=key).first()
            if not obj:
                raise KvKeyNotFoundError

            if obj.value is not None:
                value = obj.value
            elif obj.encrypted_value is not None:
                value = obj.encrypted_value
            else:
                value = None

            try:
                self.redis_client.set(REDIS_KEY_PREFIX + key, json.dumps(value))
            except Exception as e:
                logger.error(f"Failed to set value in Redis for key '{key}': {str(e)}")

            return cast(JSON_ro, value)

    def delete(self, key: str) -> None:
        try:
            self.redis_client.delete(REDIS_KEY_PREFIX + key)
        except Exception as e:
            logger.error(f"Failed to delete value from Redis for key '{key}': {str(e)}")

        with self.get_session() as session:
            result = session.query(KVStore).filter_by(key=key).delete()  # type: ignore
            if result == 0:
                raise KvKeyNotFoundError
            session.commit()
