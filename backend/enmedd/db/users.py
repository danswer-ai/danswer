import uuid
from collections.abc import Sequence

from fastapi import HTTPException
from fastapi import status
from sqlalchemy.orm import Session
from sqlalchemy.schema import Column

from enmedd.db.models import User


def list_users(db_session: Session, q: str = "") -> Sequence[User]:
    """List all users. No pagination as of now, as the # of users
    is assumed to be relatively small (<< 1 million)"""
    query = db_session.query(User)
    if q:
        query = query.filter(Column("email").ilike("%{}%".format(q)))
    return query.all()


def get_user_by_email(email: str, db_session: Session) -> User | None:
    user = db_session.query(User).filter(User.email == email).first()  # type: ignore

    return user


def get_user_by_id(id: uuid.UUID, db_session: Session) -> User | None:
    user = db_session.query(User).filter(User.id == id).first()
    return user


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
