import uuid
from datetime import datetime
from enum import Enum

from fastapi_users import schemas
from pydantic import BaseModel


class UserRole(str, Enum):
    """
    User roles
    - Basic can't perform any admin actions
    - Admin can perform all admin actions
    - Curator can perform admin actions for
        groups they are curators of
    - Global Curator can perform admin actions
        for all groups they are a member of
    """

    BASIC = "basic"
    ADMIN = "admin"
    CURATOR = "curator"
    GLOBAL_CURATOR = "global_curator"


class UserStatus(str, Enum):
    LIVE = "live"
    INVITED = "invited"
    DEACTIVATED = "deactivated"


class UserRead(schemas.BaseUser[uuid.UUID]):
    role: UserRole


class UserCreate(schemas.BaseUserCreate):
    role: UserRole = UserRole.BASIC


class UserUpdate(schemas.BaseUserUpdate):
    role: UserRole


class OIDCTokenRefreshResult(BaseModel):
    oidc_expiry: datetime
    refresh_token: str
