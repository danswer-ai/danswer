from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import User
from danswer.db.models import User__UserGroup
from danswer.db.models import UserRole


def list_users(
    db_session: Session, email_filter_string: str = "", user: User | None = None
) -> Sequence[User]:
    """List all users. No pagination as of now, as the # of users
    is assumed to be relatively small (<< 1 million)"""
    stmt = select(User)

    if email_filter_string:
        stmt = stmt.where(User.email.ilike(f"%{email_filter_string}%"))  # type: ignore

    if user and user.role != UserRole.ADMIN:
        stmt = stmt.join(User__UserGroup)
        where_clause = User__UserGroup.user_id == user.id
        if user.role == UserRole.CURATOR:
            where_clause &= User__UserGroup.is_curator == True  # noqa: E712
        stmt = stmt.where(where_clause)

    return db_session.scalars(stmt).unique().all()


def get_user_by_email(email: str, db_session: Session) -> User | None:
    user = db_session.query(User).filter(User.email == email).first()  # type: ignore

    return user


def fetch_user_by_id(db_session: Session, user_id: UUID) -> User | None:
    user = db_session.query(User).filter(User.id == user_id).first()  # type: ignore

    return user
