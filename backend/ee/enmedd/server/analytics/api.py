import datetime
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ee.enmedd.db.analytics import fetch_per_user_query_analytics
from ee.enmedd.db.analytics import fetch_query_analytics
from enmedd.auth.users import current_teamspace_admin_user
from enmedd.db.engine import get_session
from enmedd.db.models import User

router = APIRouter(prefix="/analytics")


class QueryAnalyticsResponse(BaseModel):
    total_queries: int
    total_likes: int
    total_dislikes: int
    date: datetime.date


@router.get("/admin/query")
def get_query_analytics(
    start: datetime.datetime | None = None,
    end: datetime.datetime | None = None,
    teamspace_id: Optional[int] = None,
    _: User | None = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> list[QueryAnalyticsResponse]:
    start = start or (datetime.datetime.utcnow() - datetime.timedelta(days=30))
    end = end or datetime.datetime.utcnow()

    daily_query_usage_info = fetch_query_analytics(
        start=start,
        end=end,
        teamspace_id=teamspace_id,
        db_session=db_session,
    )
    return [
        QueryAnalyticsResponse(
            total_queries=total_queries,
            total_likes=total_likes,
            total_dislikes=total_dislikes,
            date=date,
        )
        for total_queries, total_likes, total_dislikes, date in daily_query_usage_info
    ]


class UserAnalyticsResponse(BaseModel):
    total_active_users: int
    date: datetime.date


@router.get("/admin/user")
def get_user_analytics(
    start: datetime.datetime | None = None,
    end: datetime.datetime | None = None,
    teamspace_id: Optional[int] = None,
    _: User | None = Depends(current_teamspace_admin_user),
    db_session: Session = Depends(get_session),
) -> list[UserAnalyticsResponse]:
    daily_query_usage_info_per_user = fetch_per_user_query_analytics(
        start=start
        or (
            datetime.datetime.utcnow() - datetime.timedelta(days=30)
        ),  # default is 30d lookback
        end=end or datetime.datetime.utcnow(),
        teamspace_id=teamspace_id,
        db_session=db_session,
    )

    user_analytics: dict[datetime.date, int] = defaultdict(int)
    for __, ___, ____, date, _____ in daily_query_usage_info_per_user:
        user_analytics[date] += 1
    return [
        UserAnalyticsResponse(
            total_active_users=cnt,
            date=date,
        )
        for date, cnt in user_analytics.items()
    ]
