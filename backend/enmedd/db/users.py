import uuid
from collections.abc import Sequence
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from fastapi import status
from fastapi_users.password import PasswordHelper
from sqlalchemy import Column
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.auth.schemas import UserRole
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace


def list_users(
    db_session: Session,
    q: str = "",
    teamspace_id: Optional[int] = None,
    include_teamspace_user: bool = True,
) -> Sequence[User]:
    """List all users. No pagination as of now, as the # of users
    is assumed to be relatively small (<< 1 million)"""
    query = db_session.query(User)
    if q:
        query = query.filter(Column("email").ilike(f"%{q}%"))

    if teamspace_id is not None:
        if include_teamspace_user:
            query = query.join(User__Teamspace).filter(
                User__Teamspace.teamspace_id == teamspace_id
            )
        else:
            subquery = select(User__Teamspace.user_id).where(
                User__Teamspace.teamspace_id == teamspace_id
            )
            query = query.filter(~User.id.in_(subquery))

    return query.all()


def get_users_by_emails(
    db_session: Session, emails: list[str]
) -> tuple[list[User], list[str]]:
    # Use distinct to avoid duplicates
    stmt = select(User).filter(User.email.in_(emails))  # type: ignore
    found_users = list(db_session.scalars(stmt).unique().all())  # Convert to list
    found_users_emails = [user.email for user in found_users]
    missing_user_emails = [email for email in emails if email not in found_users_emails]
    return found_users, missing_user_emails


def get_user_by_email(email: str, db_session: Session) -> User | None:
    user = (
        db_session.query(User)
        .filter(func.lower(User.email) == func.lower(email))
        .first()
    )

    return user


def fetch_user_by_id(db_session: Session, user_id: UUID) -> User | None:
    user = db_session.query(User).filter(User.id == user_id).first()  # type: ignore

    return user


def _generate_non_web_user(email: str) -> User:
    fastapi_users_pw_helper = PasswordHelper()
    password = fastapi_users_pw_helper.generate()
    hashed_pass = fastapi_users_pw_helper.hash(password)
    return User(
        email=email,
        hashed_password=hashed_pass,
        role=UserRole.BASIC,
    )


def add_non_web_user_if_not_exists(db_session: Session, email: str) -> User:
    user = get_user_by_email(email, db_session)
    if user is not None:
        return user

    user = _generate_non_web_user(email=email)
    db_session.add(user)
    db_session.commit()
    return user


def add_non_web_user_if_not_exists__no_commit(db_session: Session, email: str) -> User:
    user = get_user_by_email(email, db_session)
    if user is not None:
        return user

    user = _generate_non_web_user(email=email)
    db_session.add(user)
    db_session.flush()  # generate id
    return user


def batch_add_non_web_user_if_not_exists__no_commit(
    db_session: Session, emails: list[str]
) -> list[User]:
    found_users, missing_user_emails = get_users_by_emails(db_session, emails)

    new_users: list[User] = []
    for email in missing_user_emails:
        new_users.append(_generate_non_web_user(email=email))

    db_session.add_all(new_users)
    db_session.flush()  # generate ids

    return found_users + new_users


def change_user_password(
    user_id: uuid.UUID, new_password: str, db_session: Session
) -> None:
    try:
        user = db_session.query(User).filter(User.id == user_id).first()  # type: ignore
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        user.hashed_password = new_password
        db_session.add(user)
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Something went wrong: {e}",
        )
