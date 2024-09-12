import threading
from typing import Optional

import redis
from redis.client import Redis
from redis.connection import ConnectionPool

from danswer.configs.app_configs import REDIS_DB_NUMBER
from danswer.configs.app_configs import REDIS_HOST
from danswer.configs.app_configs import REDIS_PASSWORD
from danswer.configs.app_configs import REDIS_PORT
from danswer.configs.app_configs import REDIS_SSL
from danswer.configs.app_configs import REDIS_SSL_CA_CERTS
from danswer.configs.app_configs import REDIS_SSL_CERT_REQS

REDIS_POOL_MAX_CONNECTIONS = 10


class RedisPool:
    _instance: Optional["RedisPool"] = None
    _lock: threading.Lock = threading.Lock()
    _pool: ConnectionPool

    def __new__(cls) -> "RedisPool":
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(RedisPool, cls).__new__(cls)
                    cls._instance._init_pool()
        return cls._instance

    def _init_pool(self) -> None:
        if REDIS_SSL:
            self._pool = redis.ConnectionPool(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB_NUMBER,
                password=REDIS_PASSWORD,
                max_connections=REDIS_POOL_MAX_CONNECTIONS,
                ssl=True,
                ssl_ca_certs=REDIS_SSL_CA_CERTS,
                ssl_cert_reqs=REDIS_SSL_CERT_REQS,
            )
        else:
            self._pool = redis.ConnectionPool(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB_NUMBER,
                password=REDIS_PASSWORD,
                max_connections=REDIS_POOL_MAX_CONNECTIONS,
            )

    def get_client(self) -> Redis:
        return redis.Redis(connection_pool=self._pool)


# # Usage example
# redis_pool = RedisPool()
# redis_client = redis_pool.get_client()

# # Example of setting and getting a value
# redis_client.set('key', 'value')
# value = redis_client.get('key')
# print(value.decode())  # Output: 'value'
