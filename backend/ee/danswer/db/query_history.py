import datetime
from collections.abc import Sequence
from typing import cast
from typing import Literal

from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import InstrumentedAttribute

from danswer.configs.constants import QAFeedbackType
from danswer.db.models import QueryEvent

SortByOptions = Literal["time_created", "feedback"]


def fetch_query_history(
    db_session: Session,
    start: datetime.datetime,
    end: datetime.datetime,
    query: str | None = None,
    feedback_type: QAFeedbackType | None = None,
    sort_by_field: SortByOptions = "time_created",
    sort_by_direction: Literal["asc", "desc"] = "desc",
    offset: int = 0,
    limit: int = 500,
) -> Sequence[QueryEvent]:
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

    stmt = stmt.offset(offset).limit(limit)

    if query:
        stmt = stmt.where(
            or_(
                QueryEvent.llm_answer.ilike(f"%{query}%"),
                QueryEvent.query.ilike(f"%{query}%"),
            )
        )

    if feedback_type:
        stmt = stmt.where(QueryEvent.feedback == feedback_type)

    return db_session.scalars(stmt).all()
