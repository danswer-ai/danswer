from uuid import UUID

from sqlalchemy.orm import Session

from danswer.db.chat import delete_chat_session
from danswer.db.models import ChatFolder
from danswer.db.models import ChatSession
from danswer.utils.logger import setup_logger

logger = setup_logger()


def get_folder_by_id(
    user_id: UUID | None,
    folder_id: int,
    db_session: Session,
) -> ChatFolder:
    folder = (
        db_session.query(ChatFolder).filter(ChatFolder.id == folder_id).one_or_none()
    )
    if not folder:
        raise ValueError("Folder by specified id does not exist")

    if folder.user_id != user_id:
        raise PermissionError(f"Folder does not belong to user: {user_id}")

    return folder


def create_folder(
    user_id: UUID | None, folder_name: str | None, db_session: Session
) -> int:
    new_folder = ChatFolder(
        user_id=user_id,
        name=folder_name,
    )
    db_session.add(new_folder)
    db_session.commit()

    return new_folder.id


def rename_folder(
    user_id: UUID | None, folder_id: int, folder_name: str | None, db_session: Session
) -> None:
    folder = get_folder_by_id(
        user_id=user_id, folder_id=folder_id, db_session=db_session
    )

    folder.name = folder_name
    db_session.commit()


def add_chat_to_folder(
    user_id: UUID | None, folder_id: int, chat_session: ChatSession, db_session: Session
) -> None:
    folder = get_folder_by_id(
        user_id=user_id, folder_id=folder_id, db_session=db_session
    )

    chat_session.folder_id = folder.id
    if chat_session not in folder.chat_sessions:
        folder.chat_sessions.append(chat_session)
        db_session.commit()


def remove_chat_from_folder(
    user_id: UUID | None, folder_id: int, chat_session: ChatSession, db_session: Session
) -> None:
    folder = get_folder_by_id(
        user_id=user_id, folder_id=folder_id, db_session=db_session
    )

    if chat_session.folder_id != folder.id:
        raise ValueError("The chat session is not in the specified folder.")

    if folder.user_id != user_id:
        raise ValueError(
            f"Tried to remove a chat session from a folder that does not below to "
            f"this user, user id: {user_id}"
        )

    chat_session.folder_id = None
    if chat_session in folder.chat_sessions:
        folder.chat_sessions.remove(chat_session)

    db_session.commit()


def delete_folder(
    user_id: UUID | None,
    folder_id: int,
    including_chats: bool,
    db_session: Session,
) -> None:
    folder = get_folder_by_id(
        user_id=user_id, folder_id=folder_id, db_session=db_session
    )

    # Assuming there will not be a massive number of chats in any given folder
    if including_chats:
        for chat_session in folder.chat_sessions:
            delete_chat_session(
                user_id=user_id,
                chat_session_id=chat_session.id,
                db_session=db_session,
            )

    db_session.delete(folder)
    db_session.commit()
