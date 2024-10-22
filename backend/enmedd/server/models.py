from typing import Dict
from typing import Generic
from typing import Optional
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr

from enmedd.auth.schemas import UserRole
from enmedd.auth.schemas import UserStatus


DataT = TypeVar("DataT")


class StatusResponse(BaseModel, Generic[DataT]):
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
    is_custom_profile: bool = False


class FullUserSnapshot(BaseModel):
    id: UUID
    full_name: str
    company_name: Optional[str]
    company_email: Optional[EmailStr]
    company_billing: Optional[str]
    billing_email_address: Optional[EmailStr]
    is_custom_profile: bool = False
    vat: Optional[str]
    email: str
    role: UserRole
    status: UserStatus


class InvitedUserSnapshot(BaseModel):
    email: str


class DisplayPriorityRequest(BaseModel):
    display_priority_map: Dict[int, int]


class MinimalWorkspaceSnapshot(BaseModel):
    id: int
    workspace_name: Optional[str] = None


class MinimalTeamspaceSnapshot(BaseModel):
    id: int
    name: Optional[str] = None
    workspace: Optional[list[MinimalWorkspaceSnapshot]] = []


# TODO add aditional teamspace info to include in the response
class TeamspaceResponse(BaseModel):
    id: int
    name: Optional[str] = None
    is_custom_logo: bool = False


class WorkspaceResponse(BaseModel):
    id: int
    instance_id: int
    workspace_name: Optional[str] = None
    workspace_description: Optional[str] = None
    use_custom_logo: bool = False
    custom_logo: Optional[str] = None
    custom_header_logo: Optional[str] = None
    custom_header_content: Optional[str] = None
