from uuid import UUID

from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload
from sqlalchemy.orm import Session

from danswer.configs.app_configs import HARD_DELETE_CHATS
from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import ChatSession
from danswer.db.models import Persona


def fetch_chat_sessions_by_user(
    user_id: UUID | None,
    deleted: bool | None,
    db_session: Session,
) -> list[ChatSession]:
    stmt = select(ChatSession).where(ChatSession.user_id == user_id)

    if deleted is not None:
        stmt = stmt.where(ChatSession.deleted == deleted)

    result = db_session.execute(stmt)
    chat_sessions = result.scalars().all()

    return list(chat_sessions)


def fetch_chat_messages_by_session(
    chat_session_id: int, db_session: Session
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.chat_session_id == chat_session_id)
        .order_by(ChatMessage.message_number.asc(), ChatMessage.edit_number.asc())
    )
    result = db_session.execute(stmt).scalars().all()
    return list(result)


def fetch_chat_message(
    chat_session_id: int, message_number: int, edit_number: int, db_session: Session
) -> ChatMessage:
    stmt = (
        select(ChatMessage)
        .where(
            (ChatMessage.chat_session_id == chat_session_id)
            & (ChatMessage.message_number == message_number)
            & (ChatMessage.edit_number == edit_number)
        )
        .options(selectinload(ChatMessage.chat_session))
    )

    chat_message = db_session.execute(stmt).scalar_one_or_none()

    if not chat_message:
        raise ValueError("Invalid Chat Message specified")

    return chat_message


def fetch_chat_session_by_id(chat_session_id: int, db_session: Session) -> ChatSession:
    stmt = select(ChatSession).where(ChatSession.id == chat_session_id)
    result = db_session.execute(stmt)
    chat_session = result.scalar_one_or_none()

    if not chat_session:
        raise ValueError("Invalid Chat Session ID provided")

    return chat_session


def verify_parent_exists(
    chat_session_id: int,
    message_number: int,
    parent_edit_number: int | None,
    db_session: Session,
) -> ChatMessage:
    stmt = select(ChatMessage).where(
        (ChatMessage.chat_session_id == chat_session_id)
        & (ChatMessage.message_number == message_number - 1)
        & (ChatMessage.edit_number == parent_edit_number)
    )

    result = db_session.execute(stmt)

    try:
        return result.scalar_one()
    except NoResultFound:
        raise ValueError("Invalid message, parent message not found")


def create_chat_session(
    description: str, user_id: UUID | None, db_session: Session
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

    if chat_session.deleted:
        raise ValueError("Trying to rename a deleted chat session")

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
        stmt_messages = delete(ChatMessage).where(
            ChatMessage.chat_session_id == chat_session_id
        )
        db_session.execute(stmt_messages)

        stmt = delete(ChatSession).where(ChatSession.id == chat_session_id)
        db_session.execute(stmt)

    else:
        chat_session.deleted = True

    db_session.commit()


def _set_latest_chat_message_no_commit(
    chat_session_id: int,
    message_number: int,
    parent_edit_number: int | None,
    edit_number: int,
    db_session: Session,
) -> None:
    if message_number != 0 and parent_edit_number is None:
        raise ValueError(
            "Only initial message in a chat is allowed to not have a parent"
        )

    db_session.query(ChatMessage).filter(
        and_(
            ChatMessage.chat_session_id == chat_session_id,
            ChatMessage.message_number == message_number,
            ChatMessage.parent_edit_number == parent_edit_number,
        )
    ).update({ChatMessage.latest: False})

    db_session.query(ChatMessage).filter(
        and_(
            ChatMessage.chat_session_id == chat_session_id,
            ChatMessage.message_number == message_number,
            ChatMessage.edit_number == edit_number,
        )
    ).update({ChatMessage.latest: True})


def create_new_chat_message(
    chat_session_id: int,
    message_number: int,
    message: str,
    token_count: int,
    parent_edit_number: int | None,
    message_type: MessageType,
    db_session: Session,
) -> ChatMessage:
    """Creates a new chat message and sets it to the latest message of its parent message"""
    # Get the count of existing edits at the provided message number
    latest_edit_number = (
        db_session.query(func.max(ChatMessage.edit_number))
        .filter_by(
            chat_session_id=chat_session_id,
            message_number=message_number,
        )
        .scalar()
    )

    # The new message is a new edit at the provided message number
    new_edit_number = latest_edit_number + 1 if latest_edit_number is not None else 0

    # Create a new message and set it to be the latest for its parent message
    new_chat_message = ChatMessage(
        chat_session_id=chat_session_id,
        message_number=message_number,
        parent_edit_number=parent_edit_number,
        edit_number=new_edit_number,
        message=message,
        token_count=token_count,
        message_type=message_type,
    )

    db_session.add(new_chat_message)

    # Set the previous latest message of the same parent, as no longer the latest
    _set_latest_chat_message_no_commit(
        chat_session_id=chat_session_id,
        message_number=message_number,
        parent_edit_number=parent_edit_number,
        edit_number=new_edit_number,
        db_session=db_session,
    )

    db_session.commit()

    return new_chat_message


def set_latest_chat_message(
    chat_session_id: int,
    message_number: int,
    parent_edit_number: int | None,
    edit_number: int,
    db_session: Session,
) -> None:
    _set_latest_chat_message_no_commit(
        chat_session_id=chat_session_id,
        message_number=message_number,
        parent_edit_number=parent_edit_number,
        edit_number=edit_number,
        db_session=db_session,
    )

    db_session.commit()


def fetch_persona_by_id(persona_id: int, db_session: Session) -> Persona:
    stmt = select(Persona).where(Persona.id == persona_id)
    result = db_session.execute(stmt)
    persona = result.scalar_one_or_none()

    if persona is None:
        raise ValueError(f"Persona with ID {persona_id} does not exist")

    return persona


def create_persona(
    persona_id: int | None,
    name: str,
    retrieval_enabled: bool,
    system_text: str | None,
    tools_text: str | None,
    hint_text: str | None,
    default_persona: bool,
    db_session: Session,
    commit: bool = True,
) -> Persona:
    persona = db_session.query(Persona).filter_by(id=persona_id).first()

    if persona:
        persona.name = name
        persona.retrieval_enabled = retrieval_enabled
        persona.system_text = system_text
        persona.tools_text = tools_text
        persona.hint_text = hint_text
        persona.default_persona = default_persona
    else:
        persona = Persona(
            id=persona_id,
            name=name,
            retrieval_enabled=retrieval_enabled,
            system_text=system_text,
            tools_text=tools_text,
            hint_text=hint_text,
            default_persona=default_persona,
        )
        db_session.add(persona)

    if commit:
        db_session.commit()
    else:
        # flush the session so that the persona has an ID
        db_session.flush()

    return persona
