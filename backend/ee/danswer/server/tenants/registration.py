import logging

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import Response
from fastapi_users import exceptions
from fastapi_users.router.common import ErrorCode

from danswer.auth.schemas import UserCreate
from danswer.auth.schemas import UserRead
from danswer.auth.users import auth_backend
from danswer.auth.users import get_jwt_strategy
from danswer.auth.users import get_tenant_id_for_email
from danswer.auth.users import get_user_manager
from danswer.auth.users import UserManager
from danswer.db.auth import SQLAlchemyUserAdminDB
from danswer.db.engine import get_async_session_with_tenant
from danswer.db.models import OAuthAccount
from danswer.db.models import User
from ee.danswer.server.tenants.provisioning import TenantProvisioningService
from shared_configs.contextvars import CURRENT_TENANT_ID_CONTEXTVAR

# Import necessary modules and functions

logger = logging.getLogger(__name__)

router = APIRouter()
tenant_service = TenantProvisioningService()


@router.post("/register", response_model=UserRead)
async def register(
    user_create: UserCreate,
    request: Request,
    response: Response,
    user_manager: UserManager = Depends(get_user_manager),
    # Include any other dependencies you need
) -> UserRead:
    try:
        # Check if user already belongs to a tenant
        tenant_id = get_tenant_id_for_email(user_create.email)
    except exceptions.UserNotExists:
        # User does not belong to a tenant; need to provision a new tenant
        tenant_id = None

    if not tenant_id:
        # Provision the tenant
        try:
            tenant_id = await tenant_service.provision_tenant(user_create.email)
        except Exception as e:
            logger.error(f"Tenant provisioning failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to provision tenant.")

    # Proceed with user creation
    if tenant_id is None:
        raise HTTPException(status_code=500, detail="Failed to provision tenant.")
    token = None
    try:
        # Set the tenant ID context variable
        token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id)

        async with get_async_session_with_tenant(tenant_id) as db_session:
            # Set up user manager with tenant-specific user DB
            tenant_user_db = SQLAlchemyUserAdminDB(db_session, User, OAuthAccount)
            user_manager.user_db = tenant_user_db
            user_manager.database = tenant_user_db

            # Create the user
            user = await user_manager.create(user_create, request=request)

            # Optional: Log the user in automatically
            await auth_backend.login(get_jwt_strategy(), user)

            # Convert User model to UserRead schema before returning
            return UserRead.model_validate(user)

    except exceptions.UserAlreadyExists:
        raise HTTPException(
            status_code=400,
            detail=ErrorCode.REGISTER_USER_ALREADY_EXISTS,
        )
    except Exception as e:
        logger.error(f"User creation failed: {e}")
        # Optionally rollback tenant provisioning
        await tenant_service.rollback_tenant_provisioning(tenant_id)
        raise HTTPException(status_code=500, detail="Failed to create user.")
    finally:
        if token:
            CURRENT_TENANT_ID_CONTEXTVAR.reset(token)
