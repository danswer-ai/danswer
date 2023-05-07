import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine


ASYNC_DB_API = "asyncpg"
# below are intended to match the env variables names used by the official
# postgres docker image https://hub.docker.com/_/postgres
DEFAULT_USER = os.environ.get("POSTGRES_USER", "postgres")
DEFAULT_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "password")
DEFAULT_HOST = os.environ.get("POSTGRES_HOST", "localhost")
DEFULT_PORT = os.environ.get("POSTGRES_PORT", "5432")
DEFAULT_DB = os.environ.get("POSTGRES_DB", "postgres")


def build_connection_string(
    *,
    db_api: str = ASYNC_DB_API,
    user: str = DEFAULT_USER,
    password: str = DEFAULT_PASSWORD,
    host: str = DEFAULT_HOST,
    port: str = DEFULT_PORT,
    db: str = DEFAULT_DB,
) -> str:
    return f"postgresql+{db_api}://{user}:{password}@{host}:{port}/{db}"


def build_async_engine() -> AsyncEngine:
    connection_string = build_connection_string()
    return create_async_engine(connection_string)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(
        build_async_engine(), future=True, expire_on_commit=False
    ) as async_session:
        yield async_session
