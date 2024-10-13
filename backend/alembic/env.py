from typing import Any
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text

from danswer.configs.app_configs import MULTI_TENANT
from danswer.db.engine import build_connection_string
from danswer.db.models import Base
from celery.backends.database.session import ResultModelBase  # type: ignore

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None and config.attributes.get(
    "configure_logger", True
):
    fileConfig(config.config_file_name)

# Add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = [Base.metadata, ResultModelBase.metadata]


def get_schema_options() -> tuple[str, bool]:
    x_args_raw = context.get_x_argument()
    x_args = {}
    for arg in x_args_raw:
        for pair in arg.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                x_args[key.strip()] = value.strip()
    schema_name = x_args.get("schema", "public")
    create_schema = x_args.get("create_schema", "true").lower() == "true"
    return schema_name, create_schema


EXCLUDE_TABLES = {"kombu_queue", "kombu_message"}


def include_object(
    object: Any, name: str, type_: str, reflected: bool, compare_to: Any
) -> bool:
    if type_ == "table" and name in EXCLUDE_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.
    Calls to context.execute() here emit the given string to the
    script output.
    """
    schema_name, _ = get_schema_options()
    url = build_connection_string()

    context.configure(
        url=url,
        target_metadata=target_metadata,  # type: ignore
        literal_binds=True,
        include_object=include_object,
        version_table_schema=schema_name,
        include_schemas=True,
        script_location=config.get_main_option("script_location"),
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    schema_name, create_schema = get_schema_options()

    if MULTI_TENANT and schema_name == "public":
        raise ValueError(
            "Cannot run default migrations in public schema when multi-tenancy is enabled. "
            "Please specify a tenant-specific schema."
        )

    if create_schema:
        connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        connection.execute(text("COMMIT"))

    # Set search_path to the target schema
    connection.execute(text(f'SET search_path TO "{schema_name}"'))

    context.configure(
        connection=connection,
        target_metadata=target_metadata,  # type: ignore
        include_object=include_object,
        version_table_schema=schema_name,
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
        script_location=config.get_main_option("script_location"),
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        build_connection_string(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
