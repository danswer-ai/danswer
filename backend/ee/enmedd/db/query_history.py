import datetime
from typing import Literal
from typing import Optional

from sqlalchemy import asc
from sqlalchemy import BinaryExpression
from sqlalchemy import ColumnElement
from sqlalchemy import desc
from sqlalchemy.orm import contains_eager
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from enmedd.db.models import ChatMessage
from enmedd.db.models import ChatSession
from enmedd.db.models import ChatSession__Teamspace
from enmedd.db.models import TeamspaceSettings

SortByOptions = Literal["time_sent"]


def fetch_chat_sessions_eagerly_by_time(
    start: datetime.datetime,
    end: datetime.datetime,
    db_session: Session,
    limit: int | None = 500,
    teamspace_id: Optional[int] = None,
    initial_id: int | None = None,
) -> list[ChatSession]:
    id_order = desc(ChatSession.id)  # type: ignore
    time_order = desc(ChatSession.time_created)  # type: ignore
    message_order = asc(ChatMessage.id)  # type: ignore

    filters: list[ColumnElement | BinaryExpression] = [
        ChatSession.time_created.between(start, end)
    ]
    if initial_id:
        filters.append(ChatSession.id < initial_id)

    if teamspace_id:
        filters.append(ChatSession__Teamspace.teamspace_id == teamspace_id)

        subquery = (
            db_session.query(ChatSession.id, ChatSession.time_created)
            .join(
                ChatSession__Teamspace,
                ChatSession.id == ChatSession__Teamspace.chat_session_id,
            )
            .filter(*filters)
            .order_by(id_order, time_order)
            .distinct(ChatSession.id)
            .limit(limit)
            .subquery()
        )
    else:
        subquery = (
            db_session.query(ChatSession.id, ChatSession.time_created)
            .outerjoin(
                ChatSession__Teamspace,
                ChatSession.id == ChatSession__Teamspace.chat_session_id,
            )
            .outerjoin(
                TeamspaceSettings,
                TeamspaceSettings.teamspace_id == ChatSession__Teamspace.teamspace_id,
            )
            .filter(*filters)
            .filter(
                (ChatSession__Teamspace.teamspace_id.is_(None))
                | (TeamspaceSettings.chat_history_enabled.is_(True))
            )
            .order_by(id_order, time_order)
            .distinct(ChatSession.id)
            .limit(limit)
            .subquery()
        )

    query = (
        db_session.query(ChatSession)
        .join(subquery, ChatSession.id == subquery.c.id)  # type: ignore
        .outerjoin(ChatMessage, ChatSession.id == ChatMessage.chat_session_id)
        .options(
            joinedload(ChatSession.user),
            joinedload(ChatSession.assistant),
            contains_eager(ChatSession.messages).joinedload(
                ChatMessage.chat_message_feedbacks
            ),
        )
        .order_by(time_order, message_order)
    )

    chat_sessions = query.all()

    return chat_sessions
