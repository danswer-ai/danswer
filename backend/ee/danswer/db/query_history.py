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

from danswer.configs.constants import QAFeedbackType
from danswer.db.models import QueryEvent
from danswer.db.models import User

SortByOptions = Literal["time_created", "feedback"]


def build_query_history_query(
    start: datetime.datetime,
    end: datetime.datetime,
    query: str | None,
    feedback_type: QAFeedbackType | None,
    sort_by_field: SortByOptions,
    sort_by_direction: Literal["asc", "desc"],
    offset: int,
    limit: int | None,
) -> Select[tuple[QueryEvent]]:
    stmt = (
        select(QueryEvent)
        .where(
            QueryEvent.time_created >= start,
        )
        .where(
            QueryEvent.time_created <= end,
        )
    )

    order_by_field = cast(InstrumentedAttribute, getattr(QueryEvent, sort_by_field))
    if sort_by_direction == "asc":
        stmt = stmt.order_by(order_by_field.asc())
    else:
        stmt = stmt.order_by(order_by_field.desc())

    if offset:
        stmt = stmt.offset(offset)
    if limit:
        stmt = stmt.limit(limit)

    if query:
        stmt = stmt.where(
            or_(
                QueryEvent.llm_answer.ilike(f"%{query}%"),
                QueryEvent.query.ilike(f"%{query}%"),
            )
        )

    if feedback_type:
        stmt = stmt.where(QueryEvent.feedback == feedback_type)

    return stmt


def fetch_query_history(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
    query: str | None = None,
    feedback_type: QAFeedbackType | None = None,
    sort_by_field: SortByOptions = "time_created",
    sort_by_direction: Literal["asc", "desc"] = "desc",
    offset: int = 0,
    limit: int | None = 500,
) -> Sequence[QueryEvent]:
    stmt = build_query_history_query(
        start=start,
        end=end,
        query=query,
        feedback_type=feedback_type,
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
    query: str | None = None,
    feedback_type: QAFeedbackType | None = None,
    sort_by_field: SortByOptions = "time_created",
    sort_by_direction: Literal["asc", "desc"] = "desc",
    offset: int = 0,
    limit: int | None = 500,
) -> Sequence[tuple[QueryEvent, str | None]]:
    subquery = build_query_history_query(
        start=start,
        end=end,
        query=query,
        feedback_type=feedback_type,
        sort_by_field=sort_by_field,
        sort_by_direction=sort_by_direction,
        offset=offset,
        limit=limit,
    ).subquery()
    subquery_alias = aliased(QueryEvent, subquery)

    stmt_with_user_email = select(subquery_alias, User.email).join(  # type: ignore
        User, subquery_alias.user_id == User.id, isouter=True
    )

    return db_session.execute(stmt_with_user_email).all()  # type: ignore
