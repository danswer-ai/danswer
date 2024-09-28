from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.configs.app_configs import MULTI_TENANT
from danswer.db.engine import get_sqlalchemy_engine
from danswer.server.tenants.models import CreateTenantRequest
from danswer.server.tenants.provisioning import check_schema_exists
from danswer.server.tenants.provisioning import create_tenant_schema
from danswer.server.tenants.provisioning import run_alembic_migrations
from danswer.setup import setup_danswer
from danswer.utils.logger import setup_logger
from ee.danswer.server.tenants.access import control_plane_dep

logger = setup_logger()
basic_router = APIRouter(prefix="/tenants")


@basic_router.post("/create")
def create_tenant(
    create_tenant_request: CreateTenantRequest, _: None = Depends(control_plane_dep)
) -> dict[str, str]:
    tenant_id = create_tenant_request.tenant_id
    email = create_tenant_request.initial_admin_email

    if not MULTI_TENANT:
        raise HTTPException(status_code=403, detail="Multi-tenancy is not enabled")

    create_tenant_schema(tenant_id)
    run_alembic_migrations(tenant_id)

    with Session(get_sqlalchemy_engine(schema=tenant_id)) as db_session:
        setup_danswer(db_session)

    if not check_schema_exists(tenant_id):
        create_tenant_schema(tenant_id, email)

    logger.info(f"Tenant {tenant_id} created successfully")
    return {"status": "success", "message": f"Tenant {tenant_id} created successfully"}
