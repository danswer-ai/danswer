from typing import Optional

from pydantic import BaseModel

from enmedd.db.models import TokenRateLimit


class TokenRateLimitArgs(BaseModel):
    enabled: bool
    token_budget: int
    period_hours: int


class TokenRateLimitDisplay(BaseModel):
    token_id: Optional[str] = None
    enabled: Optional[bool] = None
    token_budget: Optional[int] = None
    period_hours: Optional[int] = None

    @classmethod
    def from_db(cls, token_rate_limit: TokenRateLimit) -> "TokenRateLimitDisplay":
        return cls(
            token_id=token_rate_limit.id,
            enabled=token_rate_limit.enabled,
            token_budget=token_rate_limit.token_budget,
            period_hours=token_rate_limit.period_hours,
        )
