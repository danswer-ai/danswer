from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import not_
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload
from sqlalchemy.orm import Session

from danswer.configs.chat_configs import HARD_DELETE_CHATS
from danswer.configs.constants import MessageType
from danswer.db.constants import SLACK_BOT_PERSONA_PREFIX
from danswer.db.models import ChatMessage
from danswer.db.models import ChatSession
from danswer.db.models import DocumentSet as DocumentSetDBModel
from danswer.db.models import Persona
from danswer.db.models import ToolInfo


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
    db_session: Session,
    description: str,
    user_id: UUID | None,
    persona_id: int | None = None,
) -> ChatSession:
    chat_session = ChatSession(
        user_id=user_id,
        persona_id=persona_id,
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
    retrieval_docs: dict[str, Any] | None = None,
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
        reference_docs=retrieval_docs,
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
    stmt = (
        select(Persona)
        .where(Persona.id == persona_id)
        .where(Persona.deleted == False)  # noqa: E712
    )
    result = db_session.execute(stmt)
    persona = result.scalar_one_or_none()

    if persona is None:
        raise ValueError(f"Persona with ID {persona_id} does not exist")

    return persona


def fetch_default_persona_by_name(
    persona_name: str, db_session: Session
) -> Persona | None:
    stmt = (
        select(Persona)
        .where(
            Persona.name == persona_name, Persona.default_persona == True  # noqa: E712
        )
        .where(Persona.deleted == False)  # noqa: E712
    )
    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def fetch_persona_by_name(persona_name: str, db_session: Session) -> Persona | None:
    """Try to fetch a default persona by name first,
    if not exist, try to find any persona with the name
    Note that name is not guaranteed unique unless default is true"""
    persona = fetch_default_persona_by_name(persona_name, db_session)
    if persona is not None:
        return persona

    stmt = (
        select(Persona)
        .where(Persona.name == persona_name)
        .where(Persona.deleted == False)  # noqa: E712
    )
    result = db_session.execute(stmt).first()
    if result:
        return result[0]
    return None


def upsert_persona(
    db_session: Session,
    name: str,
    retrieval_enabled: bool,
    datetime_aware: bool,
    description: str | None = None,
    system_text: str | None = None,
    tools: list[ToolInfo] | None = None,
    hint_text: str | None = None,
    num_chunks: int | None = None,
    apply_llm_relevance_filter: bool | None = None,
    persona_id: int | None = None,
    default_persona: bool = False,
    document_sets: list[DocumentSetDBModel] | None = None,
    commit: bool = True,
) -> Persona:
    persona = db_session.query(Persona).filter_by(id=persona_id).first()
    if persona and persona.deleted:
        raise ValueError("Trying to update a deleted persona")

    # Default personas are defined via yaml files at deployment time
    if persona is None:
        if default_persona:
            persona = fetch_default_persona_by_name(name, db_session)
        else:
            # only one persona with the same name should exist
            if fetch_persona_by_name(name, db_session):
                raise ValueError("Trying to create a persona with a duplicate name")

    if persona:
        persona.name = name
        persona.description = description
        persona.retrieval_enabled = retrieval_enabled
        persona.datetime_aware = datetime_aware
        persona.system_text = system_text
        persona.tools = tools
        persona.hint_text = hint_text
        persona.num_chunks = num_chunks
        persona.apply_llm_relevance_filter = apply_llm_relevance_filter
        persona.default_persona = default_persona

        # Do not delete any associations manually added unless
        # a new updated list is provided
        if document_sets is not None:
            persona.document_sets.clear()
            persona.document_sets = document_sets

    else:
        persona = Persona(
            name=name,
            description=description,
            retrieval_enabled=retrieval_enabled,
            datetime_aware=datetime_aware,
            system_text=system_text,
            tools=tools,
            hint_text=hint_text,
            num_chunks=num_chunks,
            apply_llm_relevance_filter=apply_llm_relevance_filter,
            default_persona=default_persona,
            document_sets=document_sets if document_sets else [],
        )
        db_session.add(persona)

    if commit:
        db_session.commit()
    else:
        # flush the session so that the persona has an ID
        db_session.flush()

    return persona


def fetch_personas(
    db_session: Session,
    include_default: bool = False,
    include_slack_bot_personas: bool = False,
) -> Sequence[Persona]:
    stmt = select(Persona).where(Persona.deleted == False)  # noqa: E712
    if not include_default:
        stmt = stmt.where(Persona.default_persona == False)  # noqa: E712
    if not include_slack_bot_personas:
        stmt = stmt.where(not_(Persona.name.startswith(SLACK_BOT_PERSONA_PREFIX)))

    return db_session.scalars(stmt).all()


def mark_persona_as_deleted(db_session: Session, persona_id: int) -> None:
    persona = fetch_persona_by_id(persona_id, db_session)
    persona.deleted = True
    db_session.commit()
