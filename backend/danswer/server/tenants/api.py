from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

import os
from danswer.db_setup import setup_postgres_and_initial_settings
from fastapi import Body
from danswer.db.engine import get_sqlalchemy_engine

from typing import Any
from typing import Callable
from danswer.auth.users import create_user_session
from danswer.auth.users import get_user_manager
from danswer.auth.users import UserManager
from danswer.auth.users import verify_sso_token
from danswer.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from danswer.utils.logger import setup_logger
from fastapi.responses import JSONResponse
from danswer.db.engine import get_async_session
import contextlib
from fastapi import HTTPException, Request
from sqlalchemy import text
from alembic import command

from danswer.db.engine import build_connection_string

from alembic.config import Config
from functools import wraps
import jwt
DATA_PLANE_SECRET = "your_shared_secret_key"
EXPECTED_API_KEY = "your_control_plane_api_key"
logger = setup_logger()

basic_router = APIRouter(prefix="/tenants")

def run_alembic_migrations(schema_name: str, create_schema: bool = True) -> None:
    logger.info(f"Starting Alembic migrations for schema: {schema_name}")
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
        alembic_ini_path = os.path.join(root_dir, 'alembic.ini')

        # Configure Alembic
        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option('sqlalchemy.url', build_connection_string())

        # Prepare the x arguments
        x_arg_schema = f"schema={schema_name}"
        x_arg_create_schema = f"create_schema={'true' if create_schema else 'false'}"
        x_arguments = [x_arg_schema, x_arg_create_schema]

        # Set the x arguments into the Alembic context
        alembic_cfg.cmd_opts = lambda: None  # Create a dummy object
        alembic_cfg.cmd_opts.x = x_arguments

        # Run migrations programmatically
        command.upgrade(alembic_cfg, 'head')

        logger.info(f"Alembic migrations completed successfully for schema: {schema_name}")

    except Exception as e:
        logger.exception(f"Alembic migration failed for schema {schema_name}: {str(e)}")
        raise


def authenticate_request(func: Callable) -> Callable:
    @wraps(func)
    def wrapper(request: Request, *args: Any, **kwargs: Any) -> Any:
        auth_header = request.headers.get("Authorization")
        api_key = request.headers.get("X-API-KEY")

        if api_key != EXPECTED_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, DATA_PLANE_SECRET, algorithms=["HS256"])
            if payload.get("scope") != "tenant:create":
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

        return func(request, *args, **kwargs)
    return wrapper


@basic_router.post("/create")
@authenticate_request
def create_tenant(request: Request, tenant_id: str) -> dict[str, str]:

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    logger.info(f"Received request to create tenant schema: {tenant_id}")

    with Session(get_sqlalchemy_engine(schema=tenant_id)) as db_session:
        with db_session.begin():
            result = db_session.execute(
                text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema_name"),
                {"schema_name": tenant_id}
            )
            schema_exists = result.scalar() is not None

            if not schema_exists:
                # Create schema
                db_session.execute(text(f'CREATE SCHEMA "{tenant_id}"'))
                logger.info(f"Schema {tenant_id} created")
            else:
                logger.info(f"Schema {tenant_id} already exists")

    try:
        logger.info(f"Running migrations for tenant: {tenant_id}")
        run_alembic_migrations(tenant_id)

        logger.info(f"Migrations completed for tenant: {tenant_id}")
    except Exception as e:
        logger.info("error has occurred")
        logger.exception(f"Error while running migrations for tenant {tenant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


    try:
        with Session(get_sqlalchemy_engine(schema=tenant_id)) as db_session:
            setup_postgres_and_initial_settings(db_session)
    except Exception as e:
        logger.exception(f"Error while setting up postgres for tenant {tenant_id}: {str(e)}")
        raise

    logger.info(f"Tenant {tenant_id} created successfully")
    return {"status": "success", "message": f"Tenant {tenant_id} created successfully"}

async def check_schema_exists(tenant_id: str) -> bool:
    logger.info(f"Checking if schema exists for tenant: {tenant_id}")
    get_async_session_context = contextlib.asynccontextmanager(
        get_async_session
    )
    async with get_async_session_context() as session:
        result = await session.execute(
            text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema_name"),
            {"schema_name": tenant_id}
        )
        schema = result.scalar()
        exists = schema is not None
        logger.info(f"Schema for tenant {tenant_id} exists: {exists}")
        return exists

@basic_router.post("/auth/sso-callback")
async def sso_callback(
    request: Request,
    sso_token: str = Body(..., embed=True),
    user_manager: UserManager = Depends(get_user_manager),
) -> JSONResponse:
    logger.info("SSO callback initiated")
    payload = verify_sso_token(sso_token)
    logger.info(f"SSO token verified for email: {payload['email']}")

    user = await user_manager.sso_authenticate(
        payload["email"], payload["user_id"], payload["tenant_id"]
    )
    logger.info(f"User authenticated: {user.email}")

    tenant_id = payload["tenant_id"]
    logger.info(f"Checking schema for tenant: {tenant_id}")
    # Check if tenant schema exists
    schema_exists = await check_schema_exists(tenant_id)
    if not schema_exists:
        logger.info(f"Schema does not exist for tenant: {tenant_id}")
        raise HTTPException(status_code=403, detail="Your Danswer app has not been set up yet!")

    session_token = await create_user_session(user, payload["tenant_id"])
    logger.info(f"Session token created for user: {user.email}")

    # Set the session cookie with proper flags
    response = JSONResponse(content={"message": "Authentication successful"})
    response.set_cookie(
        key="tenant_details",
        value=session_token,
        max_age=SESSION_EXPIRE_TIME_SECONDS,
        expires=SESSION_EXPIRE_TIME_SECONDS,
        path="/",
        secure=False,  # Set to True in production with HTTPS
        httponly=True,
        samesite="lax",
    )
    logger.info("Session cookie set")
    logger.info("SSO callback completed successfully")
    return response
