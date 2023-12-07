from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import not_
from sqlalchemy import nullsfirst
from sqlalchemy import select
from sqlalchemy.exc import MultipleResultsFound
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from danswer.configs.chat_configs import HARD_DELETE_CHATS
from danswer.configs.constants import MessageType
from danswer.db.constants import SLACK_BOT_PERSONA_PREFIX
from danswer.db.models import ChatMessage, SearchDoc
from danswer.db.models import ChatSession
from danswer.db.models import DocumentSet as DBDocumentSet
from danswer.db.models import Persona
from danswer.db.models import Prompt
from danswer.db.models import SearchDoc as DBSearchDoc
from danswer.search.models import SearchType
from danswer.server.chat.models import SearchDoc as ServerSearchDoc


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
        select(ChatMessage).where(ChatMessage.chat_session_id == chat_session_id)
        # Start with the root message which has no parent
        .order_by(nullsfirst(ChatMessage.parent_message))
    )
    result = db_session.execute(stmt).scalars().all()
    return list(result)


def fetch_chat_message(
    chat_message_id: int, db_session: Session, chat_session_id: int | None = None
) -> ChatMessage:
    """If dealing with user inputs, be sure to verify chat_session_id to avoid bad inputs fetching
    messages from other sessions"""
    stmt = select(ChatMessage).where(ChatMessage.id == chat_message_id)
    if chat_session_id is not None:
        stmt = stmt.where(ChatMessage.chat_session_id == chat_session_id)

    result = db_session.execute(stmt)
    chat_message = result.scalar_one_or_none()

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


def get_or_create_root_message(
    chat_session_id: int,
    db_session: Session,
) -> ChatMessage:
    try:
        root_message: ChatMessage | None = (
            db_session.query(ChatMessage)
            .filter(
                ChatMessage.chat_session_id == chat_session_id,
                ChatMessage.parent_message.is_(None),
            )
            .one_or_none()
        )
    except MultipleResultsFound:
        raise Exception(
            "Multiple root messages found for chat session. Data inconsistency detected."
        )

    if root_message is not None:
        return root_message
    else:
        new_root_message = ChatMessage(
            chat_session_id=chat_session_id,
            prompt_id=None,
            parent_message=None,
            latest_child_message=None,
            message="",
            token_count=0,
            message_type=MessageType.SYSTEM,
        )
        db_session.add(new_root_message)
        db_session.commit()
        return new_root_message


def create_new_chat_message(
    chat_session_id: int,
    parent_message: ChatMessage,
    message: str,
    prompt_id: int,
    token_count: int,
    message_type: MessageType,
    db_session: Session,
    specified_search: SearchType | None = None,
    error: str | None = None,
    reference_docs: list[DBSearchDoc] | None = None,
    commit: bool = True,
) -> ChatMessage:
    new_chat_message = ChatMessage(
        chat_session_id=chat_session_id,
        parent_message=parent_message.id,
        latest_child_message=None,
        message=message,
        prompt_id=prompt_id,
        token_count=token_count,
        message_type=message_type,
        selected_search_flow=specified_search,
        error=error
    )

    # SQL Alchemy will propagate this to update the reference_docs' foreign keys
    if reference_docs:
        new_chat_message.search_docs = reference_docs

    db_session.add(new_chat_message)

    # Flush the session to get an ID for the new chat message
    db_session.flush()

    parent_message.latest_child_message = new_chat_message.id
    if commit:
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


def fetch_prompt_by_name(
    prompt_name: str, user_id: UUID | None, db_session: Session
) -> Prompt | None:
    """Will throw exception if multiple prompt found by the name"""
    stmt = select(Prompt).where(Prompt.name == prompt_name, Prompt.user_id == user_id)
    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def fetch_persona_by_name(
    persona_name: str, user_id: UUID | None, db_session: Session
) -> Persona | None:
    """Will throw exception if multiple personas found by the name"""
    stmt = select(Persona).where(
        Persona.name == persona_name, Persona.user_id == user_id
    )
    result = db_session.execute(stmt).scalar_one_or_none()
    return result


def upsert_prompt(
    name: str,
    system_prompt: str,
    task_prompt: str,
    datetime_aware: bool,
    db_session: Session,
    prompt_id: int | None = None,
    user_id: UUID | None = None,
    default_prompt: bool = True,
    commit: bool = True,
) -> Prompt:
    prompt = db_session.query(Prompt).filter_by(id=prompt_id).first()

    if prompt is None:
        prompt = fetch_prompt_by_name(
            prompt_name=name, user_id=user_id, db_session=db_session
        )

    if prompt:
        if not default_prompt and prompt.default_prompt:
            raise ValueError("Cannot update default prompt with non-default.")

        prompt.system_prompt = system_prompt
        prompt.task_prompt = task_prompt
        prompt.datetime_aware = datetime_aware
        prompt.default_prompt = default_prompt

    else:
        prompt = Prompt(
            user_id=user_id,
            name=name,
            system_prompt=system_prompt,
            task_prompt=task_prompt,
            datetime_aware=datetime_aware,
            default_prompt=default_prompt,
        )
        db_session.add(prompt)

    if commit:
        db_session.commit()
    else:
        # Flush the session so that the Prompt has an ID
        db_session.flush()

    return prompt


def upsert_persona(
    name: str,
    description: str | None,
    num_chunks: int,
    llm_relevance_filter: bool,
    prompts: list[Prompt] | None,
    document_sets: list[DBDocumentSet] | None,
    db_session: Session,
    persona_id: int | None = None,
    user_id: UUID | None = None,
    default_persona: bool = True,
    llm_model_version_override: str | None = None,
    commit: bool = True,
) -> Persona:
    persona = db_session.query(Persona).filter_by(id=persona_id).first()

    if persona is None:
        persona = fetch_persona_by_name(
            persona_name=name, user_id=user_id, db_session=db_session
        )

    if persona:
        if not default_persona and persona.default_persona:
            raise ValueError("Cannot update default persona with non-default.")

        persona.name = name
        persona.description = description
        persona.num_chunks = num_chunks
        persona.llm_relevance_filter = llm_relevance_filter
        persona.default_persona = default_persona
        persona.llm_model_version_override = llm_model_version_override

        # Do not delete any associations manually added unless
        # a new updated list is provided
        if document_sets is not None:
            persona.document_sets.clear()
            persona.document_sets = document_sets or []

        if prompts is not None:
            persona.prompts.clear()
            persona.prompts = prompts

    else:
        persona = Persona(
            name=name,
            description=description,
            num_chunks=num_chunks,
            llm_relevance_filter=llm_relevance_filter,
            prompts=prompts,
            default_persona=default_persona,
            document_sets=document_sets or [],
            llm_model_version_override=llm_model_version_override,
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
    stmt = select(Persona)
    if not include_default:
        stmt = stmt.where(Persona.default_persona == False)  # noqa: E712
    if not include_slack_bot_personas:
        stmt = stmt.where(not_(Persona.name.startswith(SLACK_BOT_PERSONA_PREFIX)))

    return db_session.scalars(stmt).all()


def get_doc_query_identifiers_from_model(
    chat_session: int,
    search_doc_ids: list[str],
    db_session: Session
) -> list[tuple[str, int]]:
    search_docs = db_session.query(SearchDoc).filter(SearchDoc.id.in_(search_doc_ids)).all()
    if any([doc.chat_messages[0].chat_session_id != chat_session for doc in search_docs]):
        raise ValueError("Invalid reference doc, not from this chat session.")

    doc_query_identifiers = [(doc.document_id, doc.chunk_ind) for doc in search_docs]

    return doc_query_identifiers


def create_db_search_doc(
    search_doc: ServerSearchDoc
) -> SearchDoc:
