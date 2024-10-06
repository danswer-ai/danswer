from requests import Response
from requests import Session
from typing import Any, Optional

from .decorators import validate_endpoint
from .decorators import raise_for_status


class HighSpotSession:
    def __init__(
        self,
        key: str,
        secret: str,
        server: str,
    ):
        self.session = Session()
        self.session.auth = (key, secret)
        self.server = server

    def __getattribute__(self, name: str) -> Any:
        """Automatically pass through any unknown attributes to the internal `requests.Session` object."""
        try:
            return super().__getattribute__(name)
        except AttributeError:
            return getattr(self.session, name)
    
    @validate_endpoint
    @raise_for_status
    def get(self, endpoint: str, params: Optional[dict] = {}) -> Response:
        return self.session.get(f"{self.server}{endpoint}", params=params)

    @validate_endpoint
    @raise_for_status
    def post(self, endpoint: str, data: dict) -> Response:
        return self.session.post(f"{self.server}{endpoint}", json=data)

    @validate_endpoint
    @raise_for_status
    def put(self, endpoint: str, data: dict) -> Response:
        return self.session.put(f"{self.server}{endpoint}", json=data)

    @validate_endpoint
    @raise_for_status
    def delete(self, endpoint: str) -> Response:
        return self.session.delete(f"{self.server}{endpoint}")

    @validate_endpoint
    @raise_for_status
    def patch(self, endpoint: str, data: dict) -> Response:
        return self.session.patch(f"{self.server}{endpoint}", json=data)

    @validate_endpoint
    @raise_for_status
    def options(self, endpoint: str) -> Response:
        return self.session.options(f"{self.server}{endpoint}")

    @validate_endpoint
    @raise_for_status
    def head(self, endpoint: str) -> Response:
        return self.session.head(f"{self.server}{endpoint}")
