from fastapi import Body
from danswer.db.engine import get_sqlalchemy_engine
from typing import cast
from fastapi import APIRouter
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from typing import Any
from typing import Callable
from danswer.auth.users import create_user_session
from danswer.auth.users import current_admin_user
from danswer.auth.users import current_user
from danswer.auth.users import get_user_manager
from danswer.auth.users import is_user_admin
from danswer.auth.users import UserManager
from danswer.auth.users import verify_sso_token
from danswer.configs.app_configs import SESSION_EXPIRE_TIME_SECONDS
from danswer.configs.constants import KV_REINDEX_KEY
from danswer.configs.constants import NotificationType
from danswer.db.engine import get_session

from danswer.db.models import User
from danswer.db.notification import create_notification
from danswer.db.notification import dismiss_all_notifications
from danswer.db.notification import dismiss_notification
from danswer.db.notification import get_notification_by_id
from danswer.db.notification import get_notifications
from danswer.db.notification import update_notification_last_shown
from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.settings.models import Notification
from danswer.server.settings.models import Settings
from danswer.server.settings.models import UserSettings
from danswer.server.settings.store import load_settings
from danswer.server.settings.store import store_settings
from danswer.utils.logger import setup_logger
from fastapi.responses import JSONResponse
from danswer.db.engine import get_async_session
import subprocess
import contextlib
from fastapi import HTTPException, Request
from sqlalchemy import text
from alembic.config import Config
import os
from functools import wraps
import jwt
DATA_PLANE_SECRET = "your_shared_secret_key"
EXPECTED_API_KEY = "your_control_plane_api_key"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

admin_router = APIRouter(prefix="/admin/settings")
basic_router = APIRouter(prefix="/settings")


logger = setup_logger()

def run_alembic_migrations(schema_name: str) -> None:
    logger.info(f"Starting Alembic migrations for schema: {schema_name}")
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
        alembic_ini_path = os.path.join(root_dir, 'alembic.ini')

        alembic_cfg = Config(alembic_ini_path)
        alembic_cfg.set_main_option('schema_name', schema_name)

        alembic_command = f"alembic -c {alembic_ini_path} upgrade head"
        process = subprocess.Popen(alembic_command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            raise Exception(f"Alembic migration failed: {stderr.decode()}")

        logger.info(f"Alembic migrations completed successfully for schema: {schema_name}")

    except Exception as e:
        logger.info(f"Alembic migration failed for schema {schema_name}: {str(e)}")
        logger.exception(f"Alembic migration failed for schema {schema_name}: {str(e)}")
        raise
    finally:
        logger.info(f"Alembic migrations completed successfully for schema: {schema_name}")

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


@basic_router.post("/tenants/create")
@authenticate_request
def create_tenant(request: Request, tenant_id: str) -> dict[str, str]:
    print(tenant_id)

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    logger.info(f"Received request to create tenant schema: {tenant_id}")

    with Session(get_sqlalchemy_engine()) as db_session:
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
# @basic_router.post("/auth/sso-callback")
# async def sso_callback(
#     response: Response,
#     sso_token: str = Query(..., alias="sso_token"),
#     user_manager: UserManager = Depends(get_user_manager),
# ) -> JSONResponse:
#     print("I am in the sso callback")
#     logger.info("SSO callback initiated")
#     payload = verify_sso_token(sso_token)
#     logger.info(f"SSO token verified for email: {payload['email']}")

#     user = await user_manager.sso_authenticate(
#         payload["email"], payload["user_id"], payload["tenant_id"]
#     )
#     logger.info(f"User authenticated: {user.email}")

#     tenant_id = payload["tenant_id"]
#     logger.info(f"Checking schema for tenant: {tenant_id}")
#     # Check if tenant schema exists

#     schema_exists = await check_schema_exists(tenant_id)
#     if not schema_exists:
#         logger.info(f"Schema does not exist for tenant: {tenant_id}")
#         raise HTTPException(status_code=403, detail="Forbidden")


#     session_token = await create_user_session(user, payload["tenant_id"])
#     logger.info(f"Session token created for user: {user.email}")

#     # Set the session cookie with proper flags
#     response = JSONResponse(content={"message": "Authentication successful"})
#     response.set_cookie(
#         key="tenant_details",
#         value=session_token,
#         max_age=SESSION_EXPIRE_TIME_SECONDS,
#         expires=SESSION_EXPIRE_TIME_SECONDS,
#         path="/",
#         secure=False,  # Set to True in production with HTTPS
#         httponly=True,
#         samesite="lax",
#     )
#     print(session_token)
#     logger.info("Session cookie set")
#     logger.info("SSO callback completed successfully")
#     return response



@admin_router.put("")
def put_settings(
    settings: Settings, _: User | None = Depends(current_admin_user)
) -> None:
    try:
        settings.check_validity()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    store_settings(settings)


@basic_router.get("")
def fetch_settings(
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> UserSettings:
    """Settings and notifications are stuffed into this single endpoint to reduce number of
    Postgres calls"""
    general_settings = load_settings()
    user_notifications = get_user_notifications(user, db_session)

    try:
        kv_store = get_dynamic_config_store()
        needs_reindexing = cast(bool, kv_store.load(KV_REINDEX_KEY))
    except ConfigNotFoundError:
        needs_reindexing = False

    return UserSettings(
        **general_settings.model_dump(),
        notifications=user_notifications,
        needs_reindexing=needs_reindexing,
    )


@basic_router.post("/notifications/{notification_id}/dismiss")
def dismiss_notification_endpoint(
    notification_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    try:
        notification = get_notification_by_id(notification_id, user, db_session)
    except PermissionError:
        raise HTTPException(
            status_code=403, detail="Not authorized to dismiss this notification"
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Notification not found")

    dismiss_notification(notification, db_session)


def get_user_notifications(
    user: User | None, db_session: Session
) -> list[Notification]:
    return cast(list[Notification], [])
    """Get notifications for the user, currently the logic is very specific to the reindexing flag"""
    is_admin = is_user_admin(user)
    if not is_admin:
        # Reindexing flag should only be shown to admins, basic users can't trigger it anyway
        return []

    kv_store = get_dynamic_config_store()
    try:
        needs_index = cast(bool, kv_store.load(KV_REINDEX_KEY))
        if not needs_index:
            dismiss_all_notifications(
                notif_type=NotificationType.REINDEX, db_session=db_session
            )
            return []
    except ConfigNotFoundError:
        # If something goes wrong and the flag is gone, better to not start a reindexing
        # it's a heavyweight long running job and maybe this flag is cleaned up later
        logger.warning("Could not find reindex flag")
        return []

    try:
        # Need a transaction in order to prevent under-counting current notifications
        db_session.begin()

        reindex_notifs = get_notifications(
            user=user, notif_type=NotificationType.REINDEX, db_session=db_session
        )

        if not reindex_notifs:
            notif = create_notification(
                user=user,
                notif_type=NotificationType.REINDEX,
                db_session=db_session,
            )
            db_session.flush()
            db_session.commit()
            return [Notification.from_model(notif)]

        if len(reindex_notifs) > 1:
            logger.error("User has multiple reindex notifications")

        reindex_notif = reindex_notifs[0]
        update_notification_last_shown(
            notification=reindex_notif, db_session=db_session
        )

        db_session.commit()
        return [Notification.from_model(reindex_notif)]
    except SQLAlchemyError:
        logger.exception("Error while processing notifications")
        db_session.rollback()
        return []
