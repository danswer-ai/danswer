import asyncio
from logging.config import fileConfig
import os

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text


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

# Combine your models' metadata
target_metadata = [Base.metadata, ResultModelBase.metadata]


def get_schema_options():
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


schema_name, create_schema = get_schema_options()


this_dir = os.path.dirname(os.path.abspath(__file__))

if schema_name == "public":
    print("USING PUBLIC VERSIONS")
    # Set script_location to the public_versions directory
    script_location = os.path.join(this_dir, "public_versions")
else:
    print("USING VERSIONS")
    # Set script_location to the versions directory
    script_location = os.path.join(this_dir, "versions")

# Update the config with the new script_location
config.set_main_option("script_location", script_location)


EXCLUDE_TABLES = {"kombu_queue", "kombu_message"}


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in EXCLUDE_TABLES:
        return False
    return True


def run_migrations_offline():
    url = build_connection_string()

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        version_table_schema=schema_name,
        include_schemas=True,
        script_location=config.get_main_option("script_location"),
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection):
    if create_schema:
        connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        connection.execute(text("COMMIT"))

    # Set search_path to the target schema
    connection.execute(text(f'SET search_path TO "{schema_name}"'))

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        version_table_schema=schema_name,
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
        script_location=config.get_main_option("script_location"),
    )

    with context.begin_transaction():
        context.run_migrations()
    print(f"Finished migrations for schema: {schema_name}")


async def run_async_migrations():
    connectable = create_async_engine(
        build_connection_string(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
