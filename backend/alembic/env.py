import asyncio
from logging.config import fileConfig

from typing import Tuple
from alembic import context
from danswer.db.engine import build_connection_string
from danswer.db.models import Base
from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from celery.backends.database.session import ResultModelBase  # type: ignore

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here
target_metadata = [Base.metadata, ResultModelBase.metadata]

def get_schema_options() -> Tuple[str, bool]:
    x_args_raw = context.get_x_argument()
    x_args = {}
    for arg in x_args_raw:
        for pair in arg.split(','):
            if '=' in pair:
                key, value = pair.split('=', 1)
                x_args[key] = value
    print(f"x_args: {x_args}")  # For debugging
    schema_name = x_args.get('schema', 'public')  # Default schema
    create_schema = x_args.get('create_schema', 'false').lower() == 'true'
    return schema_name, create_schema

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = build_connection_string()
    schema, create_schema = get_schema_options()

    if create_schema:
        raise RuntimeError("Cannot create schema in offline mode. Please run migrations online to create the schema.")

    context.configure(
        url=url,
        target_metadata=target_metadata, # type: ignore
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=schema,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    schema, create_schema = get_schema_options()

    if create_schema:
            # Use text() to create a proper SQL expression
        connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
        connection.execute(text('COMMIT'))

    # Set the search_path to the target schema
    connection.execute(text(f'SET search_path TO "{schema}"'))

    context.configure(
        connection=connection,
        target_metadata=target_metadata, # type: ignore
        version_table_schema=schema,
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_async_engine(
        build_connection_string(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
