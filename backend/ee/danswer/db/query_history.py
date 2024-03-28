import datetime
from typing import Literal

from sqlalchemy import asc
from sqlalchemy import desc
from sqlalchemy.orm import Session

from danswer.db.models import ChatSession

SortByOptions = Literal["time_sent"]


def fetch_chat_sessions_by_time(
    start: datetime.datetime,
    end: datetime.datetime,
    db_session: Session,
    ascending: bool = False,
    limit: int | None = 500,
) -> list[ChatSession]:
    order = asc(ChatSession.time_created) if ascending else desc(ChatSession.time_created)  # type: ignore

    query = (
        db_session.query(ChatSession)
        .filter(ChatSession.time_created >= start, ChatSession.time_created <= end)
        .order_by(order)
    )

    if limit is not None:
        query = query.limit(limit)

    chat_sessions = query.all()

    return chat_sessions
