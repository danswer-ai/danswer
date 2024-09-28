from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.configs.app_configs import MULTI_TENANT
from danswer.db.engine import get_sqlalchemy_engine
from danswer.server.tenants.models import CreateTenantRequest
from danswer.server.tenants.provisioning import create_initial_admin_user
from danswer.server.tenants.provisioning import create_tenant_schema
from danswer.server.tenants.provisioning import run_alembic_migrations
from danswer.server.tenants.provisioning import setup_postgres_and_initial_settings
from danswer.utils.logger import setup_logger
from ee.danswer.auth.users import control_plane_dep

logger = setup_logger()
basic_router = APIRouter(prefix="/tenants")


@basic_router.post("/create")
def create_tenant(
    create_tenant_request: CreateTenantRequest, _: None = Depends(control_plane_dep)
) -> dict[str, str]:
    tenant_id, email = create_tenant_request
    if not MULTI_TENANT:
        raise HTTPException(status_code=403, detail="Multi-tenancy is not enabled")

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    create_tenant_schema(tenant_id)
    run_alembic_migrations(tenant_id)
    with Session(get_sqlalchemy_engine(schema=tenant_id)) as db_session:
        setup_postgres_and_initial_settings(db_session)

    create_initial_admin_user(tenant_id, email)

    logger.info(f"Tenant {tenant_id} created successfully")
    return {"status": "success", "message": f"Tenant {tenant_id} created successfully"}
