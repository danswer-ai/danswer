from collections.abc import Iterator

from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.chat.process_message import stream_chat_packets
from danswer.configs.constants import MessageType
from danswer.db.chat import create_chat_session
from danswer.db.chat import create_new_chat_message
from danswer.db.chat import delete_chat_session
from danswer.db.chat import fetch_chat_message
from danswer.db.chat import fetch_chat_messages_by_session
from danswer.db.chat import fetch_chat_session_by_id
from danswer.db.chat import fetch_chat_sessions_by_user
from danswer.db.chat import fetch_persona_by_id
from danswer.db.chat import set_latest_chat_message
from danswer.db.chat import update_chat_session
from danswer.db.engine import get_session
from danswer.db.feedback import create_chat_message_feedback
from danswer.db.models import User
from danswer.direct_qa.interfaces import DanswerAnswerPiece
from danswer.llm.utils import get_default_llm_token_encode
from danswer.secondary_llm_flows.chat_helpers import get_new_chat_name
from danswer.server.chat.models import ChatFeedbackRequest
from danswer.server.chat.models import ChatMessageDetail
from danswer.server.chat.models import ChatMessageIdentifier
from danswer.server.chat.models import ChatRenameRequest
from danswer.server.chat.models import ChatSession
from danswer.server.chat.models import ChatSessionCreationRequest
from danswer.server.chat.models import ChatSessionDetailResponse
from danswer.server.chat.models import ChatSessionsResponse
from danswer.server.chat.models import CreateChatMessageRequest
from danswer.server.chat.models import CreateChatSessionID
from danswer.server.chat.models import RegenerateMessageRequest
from danswer.server.chat.models import RenameChatSessionResponse
from danswer.server.chat.models import RetrievalDocs
from danswer.server.utils import get_json_line
from danswer.utils.logger import setup_logger
from danswer.utils.timing import log_generator_function_time


logger = setup_logger()

router = APIRouter(prefix="/chat")


@router.get("/get-user-chat-sessions")
def get_user_chat_sessions(
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ChatSessionsResponse:
    user_id = user.id if user is not None else None

    # Don't included deleted chats, even if soft delete only
    chat_sessions = fetch_chat_sessions_by_user(
        user_id=user_id, deleted=False, db_session=db_session
    )

    return ChatSessionsResponse(
        sessions=[
            ChatSession(
                id=chat.id,
                name=chat.description,
                time_created=chat.time_created.isoformat(),
            )
            for chat in chat_sessions
        ]
    )


@router.get("/get-chat-session/{session_id}")
def get_chat_session_messages(
    session_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ChatSessionDetailResponse:
    user_id = user.id if user is not None else None

    try:
        session = fetch_chat_session_by_id(session_id, db_session)
    except ValueError:
        raise ValueError("Chat Session has been deleted")

    if session.deleted:
        raise ValueError("Chat Session has been deleted")

    if user_id != session.user_id:
        if user is None:
            raise PermissionError(
                "The No-Auth User is trying to read a different user's chat"
            )
        raise PermissionError(
            f"User {user.email} is trying to read a different user's chat"
        )

    session_messages = fetch_chat_messages_by_session(
        chat_session_id=session_id, db_session=db_session
    )

    return ChatSessionDetailResponse(
        chat_session_id=session_id,
        description=session.description,
        messages=[
            ChatMessageDetail(
                message_id=msg.message_id,
                message_number=msg.message_number,
                parent_message=msg.parent_message,
                latest_child_message=msg.lastest_child_message,
                message=msg.message,
                # TODO is the context_docs correct?
                context_docs=RetrievalDocs(**msg.reference_docs)
                if msg.reference_docs
                else None,
                message_type=msg.message_type,
                time_sent=msg.time_sent,
            )
            for msg in session_messages
        ],
    )


@router.post("/create-chat-session")
def create_new_chat_session(
    chat_session_creation_request: ChatSessionCreationRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> CreateChatSessionID:
    user_id = user.id if user is not None else None

    new_chat_session = create_chat_session(
        db_session=db_session,
        description="",  # Leave the naming till later to prevent delay
        user_id=user_id,
        persona_id=chat_session_creation_request.persona_id,
    )

    return CreateChatSessionID(chat_session_id=new_chat_session.id)


@router.put("/rename-chat-session")
def rename_chat_session(
    rename: ChatRenameRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> RenameChatSessionResponse:
    name = rename.name
    message = rename.first_message
    user_id = user.id if user is not None else None

    if not name and not message:
        raise ValueError("Can't assign a name for the chat without context")

    new_name = name or get_new_chat_name(str(message))

    update_chat_session(user_id, rename.chat_session_id, new_name, db_session)

    return RenameChatSessionResponse(new_name=new_name)


@router.delete("/delete-chat-session/{session_id}")
def delete_chat_session_by_id(
    session_id: int,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user is not None else None
    delete_chat_session(user_id, session_id, db_session)


@router.post("/create-chat-message-feedback")
def create_chat_feedback(
    feedback: ChatFeedbackRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user else None

    create_chat_message_feedback(
        chat_session_id=feedback.chat_session_id,
        message_number=feedback.message_number,
        edit_number=feedback.edit_number,
        user_id=user_id,
        db_session=db_session,
        is_positive=feedback.is_positive,
        feedback_text=feedback.feedback_text,
    )


@router.post("/send-message")
def handle_new_chat_message(
    chat_message: CreateChatMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    """This endpoint is both used for sending new messages and for sending edited messages.
    To avoid extra overhead/latency, this assumes (and checks) that previous messages on the path
    have already been set as latest"""
    user_id = user.id if user is not None else None

    chat_session = fetch_chat_session_by_id(chat_message.chat_session_id, db_session)

    if chat_session.deleted:
        raise ValueError("Cannot send messages to a deleted chat session")

    if chat_session.user_id != user_id:
        if user is None:
            raise PermissionError(
                "The No-Auth User trying to interact with a different user's chat"
            )
        raise PermissionError(
            f"User {user.email} trying to interact with a different user's chat"
        )

    packets = stream_chat_packets(
        new_msg_req=chat_message,
        chat_session=chat_session,
        user=user,
        db_session=db_session,
    )

    return StreamingResponse(packets, media_type="application/json")


@router.post("/regenerate-from-parent")
def regenerate_message_given_parent(
    parent_message: RegenerateMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    """Regenerate an LLM response given a particular parent message
    The parent message is set as latest and a new LLM response is set as
    the latest following message"""
    chat_session_id = parent_message.chat_session_id
    message_number = parent_message.message_number
    edit_number = parent_message.edit_number
    user_id = user.id if user is not None else None

    llm_tokenizer = get_default_llm_token_encode()

    chat_message = fetch_chat_message(
        chat_session_id=chat_session_id,
        message_number=message_number,
        edit_number=edit_number,
        db_session=db_session,
    )

    chat_session = chat_message.chat_session
    persona = (
        fetch_persona_by_id(parent_message.persona_id, db_session)
        if parent_message.persona_id is not None
        else None
    )

    if chat_session.deleted:
        raise ValueError("Chat session has been deleted")

    if chat_session.user_id != user_id:
        if user is None:
            raise PermissionError(
                "The No-Auth User trying to regenerate chat messages of another user"
            )
        raise PermissionError(
            f"User {user.email} trying to regenerate chat messages of another user"
        )

    set_latest_chat_message(
        chat_session_id,
        message_number,
        chat_message.parent_edit_number,
        edit_number,
        db_session,
    )

    # The parent message, now set as latest, may have follow on messages
    # Don't want to include those in the context to LLM
    mainline_messages = _create_chat_chain(
        chat_session_id, db_session, stop_after=message_number
    )

    @log_generator_function_time()
    def stream_regenerate_tokens() -> Iterator[str]:
        response_packets = llm_chat_answer(
            messages=mainline_messages,
            persona=persona,
            tokenizer=llm_tokenizer,
            user=user,
            db_session=db_session,
        )
        llm_output = ""
        fetched_docs: RetrievalDocs | None = None
        for packet in response_packets:
            if isinstance(packet, DanswerAnswerPiece):
                token = packet.answer_piece
                if token:
                    llm_output += token
            elif isinstance(packet, RetrievalDocs):
                fetched_docs = packet
            yield get_json_line(packet.dict())

        create_new_chat_message(
            chat_session_id=chat_session_id,
            message_number=message_number + 1,
            parent_edit_number=edit_number,
            message=llm_output,
            token_count=len(llm_tokenizer(llm_output)),
            message_type=MessageType.ASSISTANT,
            retrieval_docs=fetched_docs.dict() if fetched_docs else None,
            db_session=db_session,
        )

    return StreamingResponse(stream_regenerate_tokens(), media_type="application/json")


@router.put("/set-message-as-latest")
def set_message_as_latest(
    message_identifier: ChatMessageIdentifier,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user is not None else None

    chat_message = fetch_chat_message(
        chat_session_id=message_identifier.chat_session_id,
        message_number=message_identifier.message_number,
        edit_number=message_identifier.edit_number,
        db_session=db_session,
    )

    chat_session = chat_message.chat_session

    if chat_session.deleted:
        raise ValueError("Chat session has been deleted")

    if chat_session.user_id != user_id:
        if user is None:
            raise PermissionError(
                "The No-Auth User trying to update chat messages of another user"
            )
        raise PermissionError(
            f"User {user.email} trying to update chat messages of another user"
        )

    set_latest_chat_message(
        chat_session_id=chat_message.chat_session_id,
        message_number=chat_message.message_number,
        parent_edit_number=chat_message.parent_edit_number,
        edit_number=chat_message.edit_number,
        db_session=db_session,
    )
