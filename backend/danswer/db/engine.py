from collections.abc import AsyncGenerator
from collections.abc import Generator

from danswer.configs.app_configs import POSTGRES_DB
from danswer.configs.app_configs import POSTGRES_HOST
from danswer.configs.app_configs import POSTGRES_PASSWORD
from danswer.configs.app_configs import POSTGRES_PORT
from danswer.configs.app_configs import POSTGRES_USER
from sqlalchemy.engine import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import Session


SYNC_DB_API = "psycopg2"
ASYNC_DB_API = "asyncpg"


def build_connection_string(
    *,
    db_api: str = ASYNC_DB_API,
    user: str = POSTGRES_USER,
    password: str = POSTGRES_PASSWORD,
    host: str = POSTGRES_HOST,
    port: str = POSTGRES_PORT,
    db: str = POSTGRES_DB,
) -> str:
    return f"postgresql+{db_api}://{user}:{password}@{host}:{port}/{db}"


def build_engine() -> Engine:
    connection_string = build_connection_string(db_api=SYNC_DB_API)
    return create_engine(connection_string)


def build_async_engine() -> AsyncEngine:
    connection_string = build_connection_string()
    return create_async_engine(connection_string)


def get_session() -> Generator[Session, None, None]:
    with Session(build_engine(), future=True, expire_on_commit=False) as session:
        yield session


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(
        build_async_engine(), future=True, expire_on_commit=False
    ) as async_session:
        yield async_session
