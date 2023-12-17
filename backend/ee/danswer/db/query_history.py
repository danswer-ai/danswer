import datetime
from collections.abc import Sequence
from typing import cast
from typing import Literal

from sqlalchemy import or_
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy.orm import aliased
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import InstrumentedAttribute

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import ChatSession
from danswer.db.models import User

SortByOptions = Literal["time_sent"]


def build_query_history_query(
    start: datetime.datetime,
    end: datetime.datetime,
    sort_by_field: SortByOptions,
    sort_by_direction: Literal["asc", "desc"],
    offset: int,
    limit: int | None,
) -> Select[tuple[ChatMessage]]:
    stmt = (
        select(ChatMessage)
        .where(
            ChatMessage.time_sent >= start,
        )
        .where(
            ChatMessage.time_sent <= end,
        )
        .where(
            or_(
                ChatMessage.message_type == MessageType.ASSISTANT,
                ChatMessage.message_type == MessageType.USER,
            ),
        )
    )

    order_by_field = cast(InstrumentedAttribute, getattr(ChatMessage, sort_by_field))
    if sort_by_direction == "asc":
        stmt = stmt.order_by(order_by_field.asc())
    else:
        stmt = stmt.order_by(order_by_field.desc())

    if offset:
        stmt = stmt.offset(offset)
    if limit:
        stmt = stmt.limit(limit)

    return stmt


def fetch_query_history(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
    sort_by_field: SortByOptions = "time_sent",
    sort_by_direction: Literal["asc", "desc"] = "desc",
    offset: int = 0,
    limit: int | None = 500,
) -> Sequence[ChatMessage]:
    stmt = build_query_history_query(
        start=start,
        end=end,
        sort_by_field=sort_by_field,
        sort_by_direction=sort_by_direction,
        offset=offset,
        limit=limit,
    )

    return db_session.scalars(stmt).all()


def fetch_query_history_with_user_email(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
    sort_by_field: SortByOptions = "time_sent",
    sort_by_direction: Literal["asc", "desc"] = "desc",
    offset: int = 0,
    limit: int | None = 500,
) -> Sequence[tuple[ChatMessage, str | None]]:
    subquery = build_query_history_query(
        start=start,
        end=end,
        sort_by_field=sort_by_field,
        sort_by_direction=sort_by_direction,
        offset=offset,
        limit=limit,
    ).subquery()
    subquery_alias = aliased(ChatMessage, subquery)

    stmt_with_user_email = (
        select(subquery_alias, User.email)  # type: ignore
        .join(ChatSession, subquery_alias.chat_session_id == ChatSession.id)
        .join(User, ChatSession.user_id == User.id, isouter=True)
    )

    return db_session.execute(stmt_with_user_email).all()  # type: ignore
