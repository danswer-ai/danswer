from typing import Optional

from pydantic import BaseModel

from enmedd.auth.schemas import UserRole


class APIKeyArgs(BaseModel):
    name: Optional[str] = None
    role: UserRole = UserRole.BASIC
