import datetime
from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import case
from sqlalchemy import cast
from sqlalchemy import Date
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.db.models import QueryEvent


def fetch_query_analytics(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
) -> Sequence[tuple[int, int, int, datetime.date]]:
    stmt = (
        select(
            func.count(QueryEvent.id),
            func.sum(case((QueryEvent.feedback == QAFeedbackType.LIKE, 1), else_=0)),
            func.sum(case((QueryEvent.feedback == QAFeedbackType.DISLIKE, 1), else_=0)),
            cast(QueryEvent.time_created, Date),
        )
        .where(
            QueryEvent.time_created >= start,
        )
        .where(
            QueryEvent.time_created <= end,
        )
        .group_by(cast(QueryEvent.time_created, Date))
        .order_by(cast(QueryEvent.time_created, Date))
    )

    return db_session.execute(stmt).all()  # type: ignore


def fetch_per_user_query_analytics(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
) -> Sequence[tuple[int, int, int, datetime.date, UUID]]:
    stmt = (
        select(
            func.count(QueryEvent.id),
            func.sum(case((QueryEvent.feedback == QAFeedbackType.LIKE, 1), else_=0)),
            func.sum(case((QueryEvent.feedback == QAFeedbackType.DISLIKE, 1), else_=0)),
            cast(QueryEvent.time_created, Date),
            QueryEvent.user_id,
        )
        .where(
            QueryEvent.time_created >= start,
        )
        .where(
            QueryEvent.time_created <= end,
        )
        .group_by(cast(QueryEvent.time_created, Date), QueryEvent.user_id)
        .order_by(cast(QueryEvent.time_created, Date), QueryEvent.user_id)
    )

    return db_session.execute(stmt).all()  # type: ignore
