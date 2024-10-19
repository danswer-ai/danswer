from pydantic import BaseModel

from enmedd.auth.schemas import UserRole


class APIKeyArgs(BaseModel):
    name: str | None = None
    role: UserRole = UserRole.BASIC
