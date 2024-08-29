import uuid
from enum import Enum
from typing import List
from typing import Optional

from fastapi_users import schemas
from pydantic import EmailStr


class Workspace(str, Enum):
    workspace_id: int
    instance_id: int
    workspace_name: str
    custom_logo: str
    custom_header_logo: str


class UserRole(str, Enum):
    BASIC = "basic"
    ADMIN = "admin"


class UserStatus(str, Enum):
    LIVE = "live"
    INVITED = "invited"
    DEACTIVATED = "deactivated"


class UserRead(schemas.BaseUser[uuid.UUID]):
    role: UserRole
    chosen_assistants: Optional[List[int]]
    full_name: Optional[str]
    company_name: Optional[str]
    company_email: Optional[EmailStr]
    company_billing: Optional[str]
    billing_email_address: Optional[EmailStr]
    vat: Optional[str]
    workspace: Optional[list[Workspace]]


class UserCreate(schemas.BaseUserCreate):
    role: UserRole = UserRole.BASIC
    chosen_assistants: Optional[List[int]]
    full_name: Optional[str]
    company_name: Optional[str]
    company_email: Optional[EmailStr]
    company_billing: Optional[str]
    billing_email_address: Optional[EmailStr]
    vat: Optional[str]
    workspace: Optional[list[Workspace]]


class UserUpdate(schemas.BaseUserUpdate):
    role: UserRole
    chosen_assistants: Optional[List[int]]
    full_name: Optional[str]
    company_name: Optional[str]
    company_email: Optional[EmailStr]
    company_billing: Optional[str]
    billing_email_address: Optional[EmailStr]
    vat: Optional[str]
    workspace: Optional[list[Workspace]]
