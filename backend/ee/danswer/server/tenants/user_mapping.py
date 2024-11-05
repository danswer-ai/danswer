import logging

from danswer.db.engine import get_session_with_tenant
from danswer.db.models import UserTenantMapping
from shared_configs.configs import POSTGRES_DEFAULT_SCHEMA

logger = logging.getLogger(__name__)


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
        except Exception:
            logger.exception(f"Failed to add users to tenant {tenant_id}")
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
