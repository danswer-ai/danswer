from typing import Generic
from typing import Optional
from typing import TypeVar
from uuid import UUID

from onyx.auth.schemas import UserRole
from onyx.auth.schemas import UserStatus
from pydantic import BaseModel


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


class FullUserSnapshot(BaseModel):
    id: UUID
    email: str
    role: UserRole
    status: UserStatus


class InvitedUserSnapshot(BaseModel):
    email: str


class DisplayPriorityRequest(BaseModel):
    display_priority_map: dict[int, int]
