from io import BytesIO
from typing import cast
from uuid import UUID
from uuid import uuid4

import requests
from sqlalchemy.orm import Session

from danswer.configs.constants import FileOrigin
from danswer.db.engine import get_session_context_manager
from danswer.db.models import ChatMessage
from danswer.file_store.file_store import get_default_file_store
from danswer.file_store.models import ChatFileType
from danswer.file_store.models import InMemoryChatFile
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel


def build_chat_file_name(
    file_name: str,
    file_type: ChatFileType,
    unique_id: UUID
    | str,  # Needed to allow multiple copies of a file to exist with the same name
) -> str:
    return f"chat__{file_type.value}__{file_name}__{unique_id}"


def load_chat_file(full_file_name: str, db_session: Session) -> InMemoryChatFile:
    file_io = get_default_file_store(db_session).read_file(full_file_name, mode="b")
    return InMemoryChatFile(file_id=full_file_name, content=file_io.read())


def load_all_chat_files(
    chat_messages: list[ChatMessage], new_file_ids: list[str], db_session: Session
) -> list[InMemoryChatFile]:
    file_ids_for_history = []
    for chat_message in chat_messages:
        if chat_message.files:
            file_ids_for_history.extend([file["id"] for file in chat_message.files])

    files = cast(
        list[InMemoryChatFile],
        run_functions_tuples_in_parallel(
            [
                (load_chat_file, (file_id, db_session))
                for file_id in new_file_ids + file_ids_for_history
            ]
        ),
    )
    return files


def save_file_from_url(url: str) -> str:
    """NOTE: using multiple sessions here, since this is often called
    using multithreading. In practice, sharing a session has resulted in
    weird errors."""
    with get_session_context_manager() as db_session:
        response = requests.get(url)
        response.raise_for_status()

        unique_id = str(uuid4())

        file_io = BytesIO(response.content)
        file_store = get_default_file_store(db_session)
        file_store.save_file(
            file_name=unique_id,
            content=file_io,
            display_name="GeneratedImage",
            file_origin=FileOrigin.CHAT_IMAGE_GEN,
            file_type="image/png;base64",
        )
        return unique_id


def save_files_from_urls(urls: list[str]) -> list[str]:
    funcs = [(save_file_from_url, (url,)) for url in urls]
    return run_functions_tuples_in_parallel(funcs)
