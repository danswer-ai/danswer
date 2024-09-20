from onyx.auth.schemas import UserRole
from pydantic import BaseModel


class APIKeyArgs(BaseModel):
    name: str | None = None
    role: UserRole = UserRole.BASIC
