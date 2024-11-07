import datetime
from collections.abc import Sequence
from typing import Optional
from uuid import UUID

from sqlalchemy import case
from sqlalchemy import cast
from sqlalchemy import Date
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.configs.constants import MessageType
from enmedd.db.models import ChatMessage
from enmedd.db.models import ChatMessageFeedback
from enmedd.db.models import ChatSession
from enmedd.db.models import ChatSession__Teamspace
from enmedd.db.models import User__Teamspace


def fetch_query_analytics(
    start: datetime.datetime,
    end: datetime.datetime,
    teamspace_id: Optional[int],
    db_session: Session,
) -> Sequence[tuple[int, int, int, datetime.date]]:
    stmt = (
        select(
            func.count(ChatMessage.id),
            func.sum(case((ChatMessageFeedback.is_positive, 1), else_=0)),
            func.sum(
                case(
                    (ChatMessageFeedback.is_positive == False, 1), else_=0  # noqa: E712
                )
            ),
            cast(ChatMessage.time_sent, Date),
        )
        .join(
            ChatMessageFeedback,
            ChatMessageFeedback.chat_message_id == ChatMessage.id,
            isouter=True,
        )
        .where(
            ChatMessage.time_sent >= start,
            ChatMessage.time_sent <= end,
            ChatMessage.message_type == MessageType.ASSISTANT,
        )
        .group_by(cast(ChatMessage.time_sent, Date))
        .order_by(cast(ChatMessage.time_sent, Date))
    )

    if teamspace_id:
        stmt = stmt.join(
            ChatSession__Teamspace,
            ChatSession__Teamspace.chat_session_id == ChatMessage.chat_session_id,
        ).where(ChatSession__Teamspace.teamspace_id == teamspace_id)

    return db_session.execute(stmt).all()  # type: ignore


def fetch_per_user_query_analytics(
    start: datetime.datetime,
    end: datetime.datetime,
    db_session: Session,
    teamspace_id: Optional[int],
) -> Sequence[tuple[int, int, int, datetime.date, UUID]]:
    stmt = (
        select(
            func.count(ChatMessage.id),
            func.sum(case((ChatMessageFeedback.is_positive, 1), else_=0)),
            func.sum(
                case(
                    (ChatMessageFeedback.is_positive == False, 1), else_=0  # noqa: E712
                )
            ),
            cast(ChatMessage.time_sent, Date),
            ChatSession.user_id,
        )
        .join(ChatSession, ChatSession.id == ChatMessage.chat_session_id)
        .where(
            ChatMessage.time_sent >= start,
        )
        .where(
            ChatMessage.time_sent <= end,
        )
        .where(ChatMessage.message_type == MessageType.ASSISTANT)
        .group_by(cast(ChatMessage.time_sent, Date), ChatSession.user_id)
        .order_by(cast(ChatMessage.time_sent, Date), ChatSession.user_id)
    )

    if teamspace_id:
        stmt = stmt.join(
            User__Teamspace, User__Teamspace.user_id == ChatSession.user_id
        )
        stmt = stmt.where(User__Teamspace.teamspace_id == teamspace_id)

    stmt = stmt.group_by(cast(ChatMessage.time_sent, Date), ChatSession.user_id)
    stmt = stmt.order_by(cast(ChatMessage.time_sent, Date), ChatSession.user_id)

    return db_session.execute(stmt).all()  # type: ignore
