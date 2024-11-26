import logging
from collections.abc import Awaitable
from collections.abc import Callable

from fastapi import FastAPI
from fastapi import Request
from fastapi import Response


def add_tenant_identification_middleware(
    app: FastAPI, logger: logging.LoggerAdapter
) -> None:
    @app.middleware("http")
    async def identify_tenant(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        tenant_id = request.headers.get("X-Tenant-ID")
        logger.debug(f"Tenant ID: {tenant_id}")
        response = await call_next(request)
        return response
