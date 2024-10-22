import uuid
from datetime import datetime
from enum import Enum
from typing import List
from typing import Optional

from fastapi_users import schemas
from pydantic import EmailStr


class UserRole(str, Enum):
    """
    User roles
    - Basic can't perform any admin actions
    - Admin can perform all admin actions
    """

    BASIC = "basic"
    ADMIN = "admin"


class TeamspaceRole(str, Enum):
    BASIC = "basic"
    ADMIN = "admin"
    CREATOR = "creator"


class UserStatus(str, Enum):
    LIVE = "live"
    INVITED = "invited"
    DEACTIVATED = "deactivated"


class UserRead(schemas.BaseUser[uuid.UUID]):
    role: UserRole
    created_at: datetime
    chosen_assistants: Optional[List[int]] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_billing: Optional[str] = None
    billing_email_address: Optional[EmailStr] = None
    vat: Optional[str] = None
    # TODO: create a default workspace for the users.
    # Adding workspace here will create async blocking I/O


class UserCreate(schemas.BaseUserCreate):
    role: UserRole = UserRole.BASIC
    chosen_assistants: Optional[List[int]] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_billing: Optional[str] = None
    billing_email_address: Optional[EmailStr] = None
    vat: Optional[str] = None


class UserUpdate(schemas.BaseUserUpdate):
    role: Optional[UserRole] = None
    chosen_assistants: Optional[List[int]] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_email: Optional[EmailStr] = None
    company_billing: Optional[str] = None
    billing_email_address: Optional[EmailStr] = None
    vat: Optional[str] = None


class ChangePassword(schemas.BaseUserUpdate):
    new_password: str
    current_password: str
