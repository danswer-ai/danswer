from typing import Any, Dict, List
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
target_metadata = [Base.metadata, ResultModelBase.metadata]

EXCLUDE_TABLES = {"kombu_queue", "kombu_message"}


def include_object(
    object: Any, name: str, type_: str, reflected: bool, compare_to: Any
) -> bool:
    if type_ == "table" and name in EXCLUDE_TABLES:
        return False
    return True


def get_schema_options() -> Dict[str, Any]:
    """
    Parses command-line options passed via '-x' in Alembic commands.
    Recognizes 'schema' and 'create_schema' options.
    """
    x_args_raw = context.get_x_argument()
    x_args = {}
    for arg in x_args_raw:
        for pair in arg.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                x_args[key.strip()] = value.strip()
    schema_name = x_args.get("schema", "public")
    create_schema = x_args.get("create_schema", "true").lower() == "true"
    return {"schema_name": schema_name, "create_schema": create_schema}


async def get_all_tenant_schemas(connection) -> List[str]:
    """
    Retrieves all tenant schemas from the database,
    excluding system schemas and any non-tenant schemas.
    Modify the query if you have specific schema naming conventions.
    """
    result = await connection.execute(
        text(
            """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'public', 'pg_catalog')
            ORDER BY schema_name
        """
        )
    )
    schemas = [row[0] for row in result]
    return schemas


def do_run_migrations(
    connection: Connection, schema_name: str, create_schema: bool
) -> None:
    """
    Executes migrations in the specified schema.
    """
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


async def run_async_migrations():
    """
    Determines whether to run migrations for a single schema or all schemas,
    and executes migrations accordingly.
    """
    options = get_schema_options()
    schema_name = options["schema_name"]
    create_schema = options["create_schema"]

    connectable = create_async_engine(
        build_connection_string(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        if schema_name == "all":
            # Run migrations for all tenant schemas
            tenant_schemas = await get_all_tenant_schemas(connection)
            # Limit the number of concurrent migrations
            semaphore = asyncio.Semaphore(10)

            async def migrate_schema(schema):
                async with semaphore:
                    await connection.run_sync(
                        do_run_migrations,
                        schema_name=schema,
                        create_schema=create_schema,
                    )
                    print(f"Migrations applied for schema: {schema}")

            await asyncio.gather(*(migrate_schema(schema) for schema in tenant_schemas))
        else:
            # Run migrations for a single schema
            await connection.run_sync(
                do_run_migrations, schema_name=schema_name, create_schema=create_schema
            )
            print(f"Migrations applied for schema: {schema_name}")

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    # Implement offline migrations if necessary
    raise NotImplementedError("Offline mode is not supported in this configuration.")
else:
    run_migrations_online()
