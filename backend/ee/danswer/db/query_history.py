import datetime
from typing import Literal

from sqlalchemy.orm import Session

from danswer.db.models import ChatSession

SortByOptions = Literal["time_sent"]


def fetch_chat_sessions_by_time(
    start: datetime.datetime, end: datetime.datetime, db_session: Session
) -> list[ChatSession]:
    chat_sessions = (
        db_session.query(ChatSession)
        .filter(ChatSession.time_created >= start, ChatSession.time_created <= end)
        .all()
    )

    return chat_sessions
