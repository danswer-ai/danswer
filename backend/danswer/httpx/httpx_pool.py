import threading
from typing import Any

import httpx


class HttpxPool:
    """Class to manage a global httpx Client instance"""

    _client: httpx.Client | None = None
    _lock: threading.Lock = threading.Lock()

    # Default parameters for creation
    DEFAULT_KWARGS = {
        "http2": True,
        "limits": httpx.Limits(),
    }

    def __init__(self) -> None:
        pass

    @classmethod
    def _init_client(cls, **kwargs: Any) -> httpx.Client:
        """Private helper method to create and return an httpx.Client."""
        merged_kwargs = {**cls.DEFAULT_KWARGS, **kwargs}
        return httpx.Client(**merged_kwargs)

    @classmethod
    def init_client(cls, **kwargs: Any) -> None:
        """Allow the caller to init the client with extra params."""
        with cls._lock:
            if not cls._client:
                cls._client = cls._init_client(**kwargs)

    @classmethod
    def get(cls) -> httpx.Client:
        """Gets the httpx.Client. Will init to default settings if not init'd."""
        if not cls._client:
            with cls._lock:
                if not cls._client:
                    cls._client = cls._init_client()
        return cls._client
