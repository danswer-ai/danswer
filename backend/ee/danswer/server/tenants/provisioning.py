import logging
import os
import uuid
from types import SimpleNamespace

import aiohttp  # Async HTTP client
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema

from alembic import command
from alembic.config import Config
from danswer.configs.app_configs import CONTROL_PLANE_API_BASE_URL
from danswer.configs.app_configs import EXPECTED_API_KEY
from danswer.db.engine import build_connection_string
from danswer.db.engine import get_session_with_tenant
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.llm import upsert_cloud_embedding_provider
from danswer.db.llm import upsert_llm_provider
from danswer.db.models import UserTenantMapping
from danswer.server.manage.embedding.models import CloudEmbeddingProviderCreationRequest
from danswer.server.manage.llm.models import LLMProviderUpsertRequest
from danswer.setup import setup_danswer
from ee.danswer.configs.app_configs import ANTHROPIC_DEFAULT_API_KEY
from ee.danswer.configs.app_configs import COHERE_DEFAULT_API_KEY
from ee.danswer.configs.app_configs import OPENAI_DEFAULT_API_KEY
from shared_configs.configs import MULTI_TENANT
from shared_configs.configs import POSTGRES_DEFAULT_SCHEMA
from shared_configs.contextvars import CURRENT_TENANT_ID_CONTEXTVAR
from shared_configs.enums import EmbeddingProvider

logger = logging.getLogger(__name__)


def drop_schema(tenant_id: str) -> None:
    with get_sqlalchemy_engine().connect() as connection:
        connection.execute(text(f"DROP SCHEMA IF EXISTS {tenant_id} CASCADE"))


class TenantProvisioningService:
    async def provision_tenant(self, email: str) -> str:
        tenant_id = str(uuid.uuid4())  # Generate new tenant ID

        # Provision tenant on data plane
        await self._provision_on_data_plane(tenant_id, email)

        # Notify control plane
        await self._notify_control_plane(tenant_id, email)

        return tenant_id

    async def _provision_on_data_plane(self, tenant_id: str, email: str) -> None:
        if not MULTI_TENANT:
            raise HTTPException(status_code=403, detail="Multi-tenancy is not enabled")

        if user_owns_a_tenant(email):
            raise HTTPException(
                status_code=409, detail="User already belongs to an organization"
            )

        logger.info(f"Provisioning tenant: {tenant_id}")
        token = None

        try:
            if not ensure_schema_exists(tenant_id):
                logger.info(f"Created schema for tenant {tenant_id}")
            else:
                logger.info(f"Schema already exists for tenant {tenant_id}")

            token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id)
            run_alembic_migrations(tenant_id)

            with get_session_with_tenant(tenant_id) as db_session:
                setup_danswer(db_session, tenant_id)
                configure_default_api_keys(db_session)

            add_users_to_tenant([email], tenant_id)

        except Exception as e:
            logger.exception(f"Failed to create tenant {tenant_id}: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to create tenant: {str(e)}"
            )
        finally:
            if token is not None:
                CURRENT_TENANT_ID_CONTEXTVAR.reset(token)

    async def _notify_control_plane(self, tenant_id: str, email: str) -> None:
        headers = {
            "Authorization": f"Bearer {EXPECTED_API_KEY}",  # Replace with your control plane API key
            "Content-Type": "application/json",
        }
        payload = {"tenant_id": tenant_id, "email": email}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{CONTROL_PLANE_API_BASE_URL}/tenants/create",  # Replace with your control plane URL
                headers=headers,
                json=payload,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Control plane tenant creation failed: {error_text}")
                    raise Exception(
                        f"Failed to create tenant on control plane: {error_text}"
                    )

    async def rollback_tenant_provisioning(self, tenant_id: str) -> None:
        # Logic to rollback tenant provisioning on data plane
        logger.info(f"Rolling back tenant provisioning for tenant_id: {tenant_id}")
        try:
            # Drop the tenant's schema to rollback provisioning
            drop_schema(tenant_id)
            # Remove tenant mapping
            with Session(get_sqlalchemy_engine()) as db_session:
                db_session.query(UserTenantMapping).filter(
                    UserTenantMapping.tenant_id == tenant_id
                ).delete()
                db_session.commit()
        except Exception as e:
            logger.error(f"Failed to rollback tenant provisioning: {e}")


# For now, we're implementing a primitive mapping between users and tenants.
# This function is only used to determine a user's relationship to a tenant upon creation (implying ownership).
def user_owns_a_tenant(email: str) -> bool:
    with get_session_with_tenant(POSTGRES_DEFAULT_SCHEMA) as db_session:
        result = (
            db_session.query(UserTenantMapping)
            .filter(UserTenantMapping.email == email)
            .first()
        )
        return result is not None


def add_users_to_tenant(emails: list[str], tenant_id: str) -> None:
    with get_session_with_tenant(POSTGRES_DEFAULT_SCHEMA) as db_session:
        try:
            for email in emails:
                db_session.add(UserTenantMapping(email=email, tenant_id=tenant_id))
        except Exception as e:
            logger.exception(f"Failed to add users to tenant {tenant_id}: {str(e)}")
        db_session.commit()


def remove_users_from_tenant(emails: list[str], tenant_id: str) -> None:
    with get_session_with_tenant(POSTGRES_DEFAULT_SCHEMA) as db_session:
        try:
            mappings_to_delete = (
                db_session.query(UserTenantMapping)
                .filter(
                    UserTenantMapping.email.in_(emails),
                    UserTenantMapping.tenant_id == tenant_id,
                )
                .all()
            )

            for mapping in mappings_to_delete:
                db_session.delete(mapping)

            db_session.commit()
        except Exception as e:
            logger.exception(
                f"Failed to remove users from tenant {tenant_id}: {str(e)}"
            )
            db_session.rollback()


def run_alembic_migrations(schema_name: str) -> None:
    logger.info(f"Starting Alembic migrations for schema: {schema_name}")

    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
        alembic_ini_path = os.path.join(root_dir, "alembic.ini")

        # Configure Alembic
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option("sqlalchemy.url", build_connection_string())
        alembic_cfg.set_main_option(
            "script_location", os.path.join(root_dir, "alembic")
        )

        # Ensure that logging isn't broken
        alembic_cfg.attributes["configure_logger"] = False

        # Mimic command-line options by adding 'cmd_opts' to the config
        alembic_cfg.cmd_opts = SimpleNamespace()  # type: ignore
        alembic_cfg.cmd_opts.x = [f"schema={schema_name}"]  # type: ignore

        # Run migrations programmatically
        command.upgrade(alembic_cfg, "head")

        # Run migrations programmatically
        logger.info(
            f"Alembic migrations completed successfully for schema: {schema_name}"
        )

    except Exception as e:
        logger.exception(f"Alembic migration failed for schema {schema_name}: {str(e)}")
        raise


def configure_default_api_keys(db_session: Session) -> None:
    open_provider = LLMProviderUpsertRequest(
        name="OpenAI",
        provider="OpenAI",
        api_key=OPENAI_DEFAULT_API_KEY,
        default_model_name="gpt-4o",
    )
    anthropic_provider = LLMProviderUpsertRequest(
        name="Anthropic",
        provider="Anthropic",
        api_key=ANTHROPIC_DEFAULT_API_KEY,
        default_model_name="claude-3-5-sonnet-20240620",
    )
    upsert_llm_provider(open_provider, db_session)
    upsert_llm_provider(anthropic_provider, db_session)

    cloud_embedding_provider = CloudEmbeddingProviderCreationRequest(
        provider_type=EmbeddingProvider.COHERE,
        api_key=COHERE_DEFAULT_API_KEY,
    )
    upsert_cloud_embedding_provider(db_session, cloud_embedding_provider)


def ensure_schema_exists(tenant_id: str) -> bool:
    with Session(get_sqlalchemy_engine()) as db_session:
        with db_session.begin():
            result = db_session.execute(
                text(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema_name"
                ),
                {"schema_name": tenant_id},
            )
            schema_exists = result.scalar() is not None
            if not schema_exists:
                stmt = CreateSchema(tenant_id)
                db_session.execute(stmt)
                return True
            return False
