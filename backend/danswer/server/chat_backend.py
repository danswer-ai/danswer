from collections.abc import Iterator
from dataclasses import asdict

from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.chat.chat_llm import llm_chat_answer
from danswer.configs.constants import MessageType
from danswer.db.chat import create_chat_session
from danswer.db.chat import create_new_chat_message
from danswer.db.chat import delete_chat_session
from danswer.db.chat import fetch_chat_messages_by_session
from danswer.db.chat import fetch_chat_session_by_id
from danswer.db.chat import update_chat_session
from danswer.db.engine import get_session
from danswer.db.models import ChatMessage
from danswer.db.models import User
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.secondary_llm_flows.chat_helpers import get_new_chat_name
from danswer.server.models import ChatRenameRequest
from danswer.server.models import ChatRequest
from danswer.server.models import CreateChatID
from danswer.server.models import SimpleTextResponse
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time


logger = setup_logger()

router = APIRouter(prefix="/chat")


@router.post("/create-chat-session")
def create_new_chat_session(
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> CreateChatID:
    new_chat_session = create_chat_session(
        "", user.id, db_session  # Leave the naming till later to prevent delay
    )

    return CreateChatID(chat_session_id=new_chat_session.id)


@router.post("/rename-chat-session")
def rename_chat_session(
    rename: ChatRenameRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> SimpleTextResponse:
    name = rename.name
    message = rename.first_message

    if not name and not message:
        raise ValueError("Can't assign a name for the chat without context")

    new_name = name or get_new_chat_name(str(message))

    update_chat_session(user.id, rename.chat_session_id, new_name, db_session)

    return SimpleTextResponse(text=new_name)


@router.delete("/delete-chat-session/{chat_session_id}")
def delete_chat_session_by_id(
    chat_session_id: int,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    delete_chat_session(user.id, chat_session_id, db_session)


def _create_chat_chain(
    chat_session_id: int,
    db_session: Session,
) -> list[ChatMessage]:
    mainline_messages: list[ChatMessage] = []
    all_chat_messages = fetch_chat_messages_by_session(chat_session_id, db_session)
    message_num = 0
    parent_edit_num = None
    while True:
        latest_msg = [
            msg
            for msg in all_chat_messages
            if msg.message_number == message_num
            and msg.parent_edit_number == parent_edit_num
            and msg.latest == True  # noqa
        ]
        if len(latest_msg) > 1:
            logger.error(
                f"This should never happen, multiple messages "
                f"for chat session {chat_session_id} are marked latest"
            )
        if not latest_msg:
            break

        mainline_messages.append(latest_msg[0])

        message_num += 1

    return mainline_messages


@router.post("/send_message")
def handle_new_chat_message(
    chat_message: ChatRequest,
    user: User = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    chat_session_id = chat_message.chat_session_id
    message_number = chat_message.message_number
    parent_edit_number = chat_message.parent_edit_number

    @log_generator_function_time()
    def stream_chat_tokens() -> Iterator[str]:
        chat_session = fetch_chat_session_by_id(chat_session_id, db_session)
        if chat_session.user_id != user.id:
            raise PermissionError(
                f"User {user.email} trying to interact with a different user's chat"
            )

        create_new_chat_message(
            chat_session_id=chat_session_id,
            message_number=message_number,
            parent_edit_number=parent_edit_number,
            message=chat_message.message,
            message_type=MessageType.USER,
            db_session=db_session,
        )

        mainline_messages = _create_chat_chain(
            chat_session_id,
            db_session,
        )

        tokens = llm_chat_answer(mainline_messages)
        for token in tokens:
            yield get_json_line(asdict(DanswerAnswerPiece(answer_piece=token)))

    return StreamingResponse(stream_chat_tokens(), media_type="application/json")
