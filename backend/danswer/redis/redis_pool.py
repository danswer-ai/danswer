import threading
from typing import Any
from typing import cast
from typing import Optional
from typing import Union

import redis
from redis.client import Redis
from redis.typing import AbsExpiryT
from redis.typing import EncodableT
from redis.typing import ExpiryT
from redis.typing import KeyT
from redis.typing import ResponseT

from danswer.configs.app_configs import REDIS_DB_NUMBER
from danswer.configs.app_configs import REDIS_HEALTH_CHECK_INTERVAL
from danswer.configs.app_configs import REDIS_HOST
from danswer.configs.app_configs import REDIS_PASSWORD
from danswer.configs.app_configs import REDIS_POOL_MAX_CONNECTIONS
from danswer.configs.app_configs import REDIS_PORT
from danswer.configs.app_configs import REDIS_SSL
from danswer.configs.app_configs import REDIS_SSL_CA_CERTS
from danswer.configs.app_configs import REDIS_SSL_CERT_REQS
from danswer.configs.constants import REDIS_SOCKET_KEEPALIVE_OPTIONS


# TODO: enforce typing strictly
class TenantRedis(redis.Redis):
    def __init__(self, tenant_id: str, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.tenant_id = tenant_id

    def _prefixed(
        self, key: Union[str, bytes, memoryview]
    ) -> Union[str, bytes, memoryview]:
        prefix = f"{self.tenant_id}:"
        if isinstance(key, str):
            return prefix + key
        elif isinstance(key, bytes):
            return prefix.encode() + key
        elif isinstance(key, memoryview):
            return memoryview(prefix.encode() + key.tobytes())
        else:
            raise TypeError(f"Unsupported key type: {type(key)}")

    def lock(
        self,
        name: str,
        timeout: Optional[float] = None,
        sleep: float = 0.1,
        blocking: bool = True,
        blocking_timeout: Optional[float] = None,
        lock_class: Union[None, Any] = None,
        thread_local: bool = True,
    ) -> Any:
        prefixed_name = cast(str, self._prefixed(name))
        return super().lock(
            prefixed_name,
            timeout=timeout,
            sleep=sleep,
            blocking=blocking,
            blocking_timeout=blocking_timeout,
            lock_class=lock_class,
            thread_local=thread_local,
        )

    def incrby(self, name: KeyT, amount: int = 1) -> ResponseT:
        """
        Increments the value of ``key`` by ``amount``.  If no key exists,
        the value will be initialized as ``amount``

        For more information see https://redis.io/commands/incrby
        """
        prefixed_name = self._prefixed(name)
        return super().incrby(prefixed_name, amount)

    def set(
        self,
        name: KeyT,
        value: EncodableT,
        ex: Union[ExpiryT, None] = None,
        px: Union[ExpiryT, None] = None,
        nx: bool = False,
        xx: bool = False,
        keepttl: bool = False,
        get: bool = False,
        exat: Union[AbsExpiryT, None] = None,
        pxat: Union[AbsExpiryT, None] = None,
    ) -> ResponseT:
        prefixed_name = self._prefixed(name)
        return super().set(
            prefixed_name,
            value,
            ex=ex,
            px=px,
            nx=nx,
            xx=xx,
            keepttl=keepttl,
            get=get,
            exat=exat,
            pxat=pxat,
        )

    def get(self, name: KeyT) -> ResponseT:
        prefixed_name = self._prefixed(name)
        return super().get(prefixed_name)

    def delete(self, *names: KeyT) -> ResponseT:
        prefixed_names = [self._prefixed(name) for name in names]
        return super().delete(*prefixed_names)

    def exists(self, *names: KeyT) -> ResponseT:
        prefixed_names = [self._prefixed(name) for name in names]
        return super().exists(*prefixed_names)

    # def expire(self, name: str, time: int, **kwargs: Any) -> Any:
    #     prefixed_name = self._prefixed(name)
    #     return super().expire(prefixed_name, time, **kwargs)

    # def ttl(self, name: str, **kwargs: Any) -> Any:
    #     prefixed_name = self._prefixed(name)
    #     return super().ttl(prefixed_name, **kwargs)

    # def type(self, name: str, **kwargs: Any) -> Any:
    #     prefixed_name = self._prefixed(name)
    #     return super().type(prefixed_name, **kwargs)


class RedisPool:
    _instance: Optional["RedisPool"] = None
    _lock: threading.Lock = threading.Lock()
    _pool: redis.BlockingConnectionPool

    def __new__(cls) -> "RedisPool":
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(RedisPool, cls).__new__(cls)
                    cls._instance._init_pool()
        return cls._instance

    def _init_pool(self) -> None:
        self._pool = RedisPool.create_pool(ssl=REDIS_SSL)

    def get_client(self, tenant_id: str | None) -> Redis:
        if tenant_id is not None:
            return TenantRedis(tenant_id, connection_pool=self._pool)
        else:
            return redis.Redis(connection_pool=self._pool)

    @staticmethod
    def create_pool(
        host: str = REDIS_HOST,
        port: int = REDIS_PORT,
        db: int = REDIS_DB_NUMBER,
        password: str = REDIS_PASSWORD,
        max_connections: int = REDIS_POOL_MAX_CONNECTIONS,
        ssl_ca_certs: str | None = REDIS_SSL_CA_CERTS,
        ssl_cert_reqs: str = REDIS_SSL_CERT_REQS,
        ssl: bool = False,
    ) -> redis.BlockingConnectionPool:
        """We use BlockingConnectionPool because it will block and wait for a connection
        rather than error if max_connections is reached. This is far more deterministic
        behavior and aligned with how we want to use Redis."""

        # Using ConnectionPool is not well documented.
        # Useful examples: https://github.com/redis/redis-py/issues/780
        if ssl:
            return redis.BlockingConnectionPool(
                host=host,
                port=port,
                db=db,
                password=password,
                max_connections=max_connections,
                timeout=None,
                health_check_interval=REDIS_HEALTH_CHECK_INTERVAL,
                socket_keepalive=True,
                socket_keepalive_options=REDIS_SOCKET_KEEPALIVE_OPTIONS,
                connection_class=redis.SSLConnection,
                ssl_ca_certs=ssl_ca_certs,
                ssl_cert_reqs=ssl_cert_reqs,
            )

        return redis.BlockingConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            max_connections=max_connections,
            timeout=None,
            health_check_interval=REDIS_HEALTH_CHECK_INTERVAL,
            socket_keepalive=True,
            socket_keepalive_options=REDIS_SOCKET_KEEPALIVE_OPTIONS,
        )


redis_pool = RedisPool()


def get_redis_client(tenant_id: str | None = None) -> Redis:
    return redis_pool.get_client(tenant_id)


# # Usage example
# redis_pool = RedisPool()
# redis_client = redis_pool.get_client()

# # Example of setting and getting a value
# redis_client.set('key', 'value')
# value = redis_client.get('key')
# print(value.decode())  # Output: 'value'
