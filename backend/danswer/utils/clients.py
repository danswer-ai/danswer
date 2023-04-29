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


_qdrant_client: Optional[QdrantClient] = None


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
        host=TYPESENSE_HOST,
        port=TYPESENSE_PORT,
        api_key=TYPESENSE_API_KEY,
        timeout=DB_CONN_TIMEOUT,
    ) -> "TSClient":
        if TSClient.__instance is None:
            TSClient(host, port, api_key, timeout)
        return TSClient.__instance  # type: ignore

    def __init__(self, host, port, api_key, timeout):
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
    def __getattr__(self, name):
        return getattr(self.client, name)
