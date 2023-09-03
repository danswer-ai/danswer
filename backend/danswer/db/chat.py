from uuid import UUID

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.app_configs import HARD_DELETE_CHATS
from danswer.db.models import ChatSession


def fetch_chat_session_by_id(chat_session_id: int, db_session: Session) -> ChatSession:
    stmt = select(ChatSession).where(ChatSession.id == chat_session_id)
    result = db_session.execute(stmt)
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        raise ValueError("Invalid Chat Session ID provided")

    return chat_session


def create_chat_session(
    user_id: UUID | None, description: str, db_session: Session
) -> ChatSession:
    chat_session = ChatSession(
        user_id=user_id,
        description=description,
    )

    db_session.add(chat_session)
    db_session.commit()

    return chat_session


def update_chat_session(
    user_id: UUID | None, chat_session_id: int, description: str, db_session: Session
) -> ChatSession:
    chat_session = fetch_chat_session_by_id(chat_session_id, db_session)

    if user_id != chat_session.user_id:
        raise ValueError("User trying to update chat of another user.")

    chat_session.description = description

    db_session.commit()

    return chat_session


def delete_chat_session(
    user_id: UUID | None,
    chat_session_id: int,
    db_session: Session,
    hard_delete: bool = HARD_DELETE_CHATS,
) -> None:
    chat_session = fetch_chat_session_by_id(chat_session_id, db_session)

    if user_id != chat_session.user_id:
        raise ValueError("User trying to delete chat of another user.")

    if hard_delete:
        # TODO ensure this cascades correctly
        stmt = delete(ChatSession).where(ChatSession.id == chat_session_id)
        db_session.execute(stmt)
    else:
        chat_session.deleted = True
        db_session.commit()
