from typing import Generic
from typing import Optional
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic.generics import GenericModel

from enmedd.auth.schemas import UserRole
from enmedd.auth.schemas import UserStatus


DataT = TypeVar("DataT")


class StatusResponse(GenericModel, Generic[DataT]):
    success: bool
    message: Optional[str] = None
    data: Optional[DataT] = None


class ApiKey(BaseModel):
    api_key: str


class IdReturn(BaseModel):
    id: int


class MinimalUserSnapshot(BaseModel):
    id: UUID
    email: str


class FullUserSnapshot(BaseModel):
    id: UUID
    full_name: str
    company_name: Optional[str]
    company_email: Optional[EmailStr]
    company_billing: Optional[str]
    billing_email_address: Optional[EmailStr]
    vat: Optional[str]
    email: str
    role: UserRole
    status: UserStatus


class InvitedUserSnapshot(BaseModel):
    email: str


class DisplayPriorityRequest(BaseModel):
    display_priority_map: dict[int, int]


class MinimalWorkspaceSnapshot(BaseModel):
    id: int
    workspace_name: str | None = None


class MinimalTeamspaceSnapshot(BaseModel):
    id: int
    name: str
    workspace: list[MinimalWorkspaceSnapshot]


class WorkspaceResponse(BaseModel):
    id: int
    instance_id: int
    workspace_name: str | None = None
    workspace_description: str | None = None
    use_custom_logo: bool = False
    custom_logo: str | None = None
    custom_header_logo: str | None = None
    custom_header_content: str | None = None
