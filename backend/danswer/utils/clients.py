from typing import Any
from typing import Optional

import typesense  # type: ignore
from danswer.configs.app_configs import DB_CONN_TIMEOUT
from danswer.configs.app_configs import QDRANT_API_KEY
from danswer.configs.app_configs import QDRANT_HOST
from danswer.configs.app_configs import QDRANT_PORT
from danswer.configs.app_configs import QDRANT_URL
from danswer.configs.app_configs import TYPESENSE_API_KEY
from danswer.configs.app_configs import TYPESENSE_HOST
from danswer.configs.app_configs import TYPESENSE_PORT
from qdrant_client import QdrantClient


_qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        if QDRANT_URL and QDRANT_API_KEY:
            _qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        elif QDRANT_HOST and QDRANT_PORT:
            _qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        else:
            raise Exception("Unable to instantiate QdrantClient")

    return _qdrant_client


class TSClient:
    __instance: Optional["TSClient"] = None

    @staticmethod
    def get_instance(
        host: str = TYPESENSE_HOST,
        port: int = TYPESENSE_PORT,
        api_key: str = TYPESENSE_API_KEY,
        timeout: int = DB_CONN_TIMEOUT,
    ) -> "TSClient":
        if TSClient.__instance is None:
            TSClient(host, port, api_key, timeout)
        return TSClient.__instance  # type: ignore

    def __init__(self, host: str, port: int, api_key: str, timeout: int) -> None:
        if TSClient.__instance is not None:
            raise Exception(
                "Singleton instance already exists. Use TSClient.get_instance() to get the instance."
            )
        else:
            TSClient.__instance = self
            self.client = typesense.Client(
                {
                    "api_key": api_key,
                    "nodes": [{"host": host, "port": str(port), "protocol": "http"}],
                    "connection_timeout_seconds": timeout,
                }
            )

    # delegate all client operations to the third party client
    def __getattr__(self, name: str) -> Any:
        return getattr(self.client, name)
