
from fastapi import APIRouter
from fastapi import Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from danswer.auth.users import current_user
from danswer.chat.process_message import stream_chat_packets
from danswer.db.chat import create_chat_session
from danswer.db.chat import delete_chat_session
from danswer.db.chat import fetch_chat_message
from danswer.db.chat import fetch_chat_messages_by_session
from danswer.db.chat import fetch_chat_session_by_id
from danswer.db.chat import fetch_chat_sessions_by_user
from danswer.db.chat import set_as_latest_chat_message
from danswer.db.chat import translate_db_message_to_chat_message_detail
from danswer.db.chat import update_chat_session
from danswer.db.engine import get_session
from danswer.db.feedback import create_chat_message_feedback
from danswer.db.feedback import create_doc_retrieval_feedback
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.secondary_llm_flows.chat_helpers import get_new_chat_name
from danswer.server.chat.models import ChatFeedbackRequest
from danswer.server.chat.models import ChatMessageIdentifier
from danswer.server.chat.models import ChatRenameRequest
from danswer.server.chat.models import ChatSession
from danswer.server.chat.models import ChatSessionCreationRequest
from danswer.server.chat.models import ChatSessionDetailResponse
from danswer.server.chat.models import ChatSessionsResponse
from danswer.server.chat.models import CreateChatMessageRequest
from danswer.server.chat.models import CreateChatSessionID
from danswer.server.chat.models import RenameChatSessionResponse
from danswer.server.chat.models import SearchFeedbackRequest
from danswer.utils.logger import setup_logger


logger = setup_logger()

router = APIRouter(prefix="/chat")


@router.get("/get-user-chat-sessions")
def get_user_chat_sessions(
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> ChatSessionsResponse:
    user_id = user.id if user is not None else None

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
        chat_session = fetch_chat_session_by_id(
            chat_session_id=session_id, user_id=user_id, db_session=db_session
        )
    except ValueError:
        raise ValueError("Chat session does not exist or has been deleted")

    session_messages = fetch_chat_messages_by_session(
        chat_session_id=session_id, user_id=user_id, db_session=db_session
    )

    return ChatSessionDetailResponse(
        chat_session_id=session_id,
        description=chat_session.description,
        messages=[
            translate_db_message_to_chat_message_detail(msg) for msg in session_messages
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


@router.post("/send-message")
def handle_new_chat_message(
    chat_message_req: CreateChatMessageRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    """This endpoint is both used for all the following purposes:
    - Sending a new message in the session
    - Regenerating a message in the session (just send the same one again)
    - Editing a message (similar to regenerating but sending a different message)

    To avoid extra overhead/latency, this assumes (and checks) that previous messages on the path
    have already been set as latest"""
    packets = stream_chat_packets(
        new_msg_req=chat_message_req,
        user=user,
        db_session=db_session,
    )

    return StreamingResponse(packets, media_type="application/json")


@router.put("/set-message-as-latest")
def set_message_as_latest(
    message_identifier: ChatMessageIdentifier,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user is not None else None

    chat_message = fetch_chat_message(
        chat_message_id=message_identifier.message_id,
        user_id=user_id,
        db_session=db_session,
    )

    set_as_latest_chat_message(
        chat_message=chat_message,
        user_id=user_id,
        db_session=db_session,
    )


@router.post("/create-chat-message-feedback")
def create_chat_feedback(
    feedback: ChatFeedbackRequest,
    user: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    user_id = user.id if user else None

    create_chat_message_feedback(
        is_positive=feedback.is_positive,
        feedback_text=feedback.feedback_text,
        chat_message_id=feedback.chat_message_id,
        user_id=user_id,
        db_session=db_session,
    )


@router.post("/document-search-feedback")
def create_search_feedback(
    feedback: SearchFeedbackRequest,
    _: User | None = Depends(current_user),
    db_session: Session = Depends(get_session),
) -> None:
    """This endpoint isn't protected - it does not check if the user has access to the document
    Users could try changing boosts of arbitrary docs but this does not leak any data.
    """
    create_doc_retrieval_feedback(
        message_id=feedback.message_id,
        document_id=feedback.document_id,
        document_rank=feedback.document_rank,
        clicked=feedback.click,
        feedback=feedback.search_feedback,
        document_index=get_default_document_index(),
        db_session=db_session,
    )
