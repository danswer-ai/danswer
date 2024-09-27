from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session
from fastapi import Body
from danswer.db.engine import get_sqlalchemy_engine
from danswer.auth.users import create_user_session
from danswer.auth.users import get_user_manager
from danswer.auth.users import UserManager
from danswer.auth.users import verify_sso_token
from danswer.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from danswer.utils.logger import setup_logger
from fastapi.responses import JSONResponse
from fastapi import HTTPException
from ee.danswer.auth.users import control_plane_dep
from danswer.server.tenants.provisioning import setup_postgres_and_initial_settings
from danswer.server.tenants.provisioning import check_schema_exists
from danswer.server.tenants.provisioning import run_alembic_migrations
from danswer.server.tenants.provisioning import create_tenant_schema
from danswer.configs.app_configs import MULTI_TENANT

logger = setup_logger()
basic_router = APIRouter(prefix="/tenants")

@basic_router.post("/create")
def create_tenant(tenant_id: str, _ =  Depends(control_plane_dep)) -> dict[str, str]:
    if not MULTI_TENANT:
        raise HTTPException(status_code=403, detail="Multi-tenant is not enabled")

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    create_tenant_schema(tenant_id)
    run_alembic_migrations(tenant_id)
    with Session(get_sqlalchemy_engine(schema=tenant_id)) as db_session:
        setup_postgres_and_initial_settings(db_session)

    logger.info(f"Tenant {tenant_id} created successfully")
    return {"status": "success", "message": f"Tenant {tenant_id} created successfully"}


@basic_router.post("/auth/sso-callback")
async def sso_callback(
    sso_token: str = Body(..., embed=True),
    user_manager: UserManager = Depends(get_user_manager),
) -> JSONResponse:
    if not MULTI_TENANT:
        raise HTTPException(status_code=403, detail="Multi-tenant is not enabled")

    payload = verify_sso_token(sso_token)
    user = await user_manager.sso_authenticate(
        payload["email"], payload["tenant_id"]
    )

    tenant_id = payload["tenant_id"]
    schema_exists = await check_schema_exists(tenant_id)
    if not schema_exists:
        raise HTTPException(status_code=403, detail="Your Danswer app has not been set up yet!")

    session_token = await create_user_session(user, payload["tenant_id"])

    response = JSONResponse(content={"message": "Authentication successful"})
    response.set_cookie(
        key="tenant_details",
        value=session_token,
        max_age=SESSION_EXPIRE_TIME_SECONDS,
        expires=SESSION_EXPIRE_TIME_SECONDS,
        path="/",
        secure=False,
        httponly=True,
        samesite="lax",
    )
    return response
