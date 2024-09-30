import json
from collections.abc import Iterator
from contextlib import contextmanager
from typing import cast

from sqlalchemy.orm import Session

from danswer.db.engine import get_session_factory
from danswer.db.models import KVStore
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.dynamic_configs.interface import DynamicConfigStore
from danswer.dynamic_configs.interface import JSON_ro
from danswer.redis.redis_pool import get_redis_client


class PostgresBackedDynamicConfigStore(DynamicConfigStore):
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
        self.redis_client.set(key, json.dumps(val))

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
        redis_value = self.redis_client.get(key)
        if redis_value:
            if isinstance(redis_value, bytes):
                return json.loads(redis_value.decode("utf-8"))
            elif isinstance(redis_value, str):
                return json.loads(redis_value)
            else:
                raise ValueError(
                    f"Unsupported type for Redis value: {type(redis_value)}"
                )

        with self.get_session() as session:
            obj = session.query(KVStore).filter_by(key=key).first()
            if not obj:
                raise ConfigNotFoundError

            if obj.value is not None:
                value = obj.value
            elif obj.encrypted_value is not None:
                value = obj.encrypted_value
            else:
                value = None

            self.redis_client.set(key, json.dumps(value))

            return cast(JSON_ro, value)

    def delete(self, key: str) -> None:
        self.redis_client.delete(key)

        with self.get_session() as session:
            result = session.query(KVStore).filter_by(key=key).delete()  # type: ignore
            if result == 0:
                raise ConfigNotFoundError
            session.commit()
