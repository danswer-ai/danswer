from typing import Literal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter
from fastapi import BackgroundTasks
from fastapi import Depends
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.chat.process_message import stream_chat_message_objects
from danswer.configs.constants import MessageType
from danswer.db.chat import get_chat_messages_by_session
from danswer.db.chat import get_chat_session_by_id
from danswer.db.chat import get_or_create_root_message
from danswer.db.engine import get_session
from danswer.db.models import ChatMessage
from danswer.db.models import User
from danswer.search.models import RetrievalDetails
from danswer.server.danswer_api.ingestion import api_key_dep
from danswer.server.query_and_chat.models import ChatMessageDetail
from danswer.server.query_and_chat.models import CreateChatMessageRequest

router = APIRouter(prefix="/runs")


class RunRequest(BaseModel):
    assistant_id: str
    thread_id: UUID
    model: Optional[str] = None
    instructions: Optional[str] = None
    additional_instructions: Optional[str] = None
    tools: Optional[list[dict]] = None
    metadata: Optional[dict] = None


class RunResponse(BaseModel):
    id: str
    object: Literal["thread.run"]
    created_at: int
    assistant_id: str
    thread_id: UUID
    status: Literal[
        "queued",
        "in_progress",
        "requires_action",
        "cancelling",
        "cancelled",
        "failed",
        "completed",
        "expired",
    ]
    started_at: Optional[int] = None
    expires_at: Optional[int] = None
    cancelled_at: Optional[int] = None
    failed_at: Optional[int] = None
    completed_at: Optional[int] = None
    last_error: Optional[dict] = None
    model: str
    instructions: str
    tools: list[dict]
    file_ids: list[str]
    metadata: Optional[dict] = None


def process_run_in_background(
    run_id: str,
    chat_session_id: UUID,
    assistant_id: str,
    instructions: str,
    db_session: Session,
):
    # Get the latest message in the chat session
    chat_messages = get_chat_messages_by_session(
        chat_session_id=chat_session_id,
        user_id=None,  # Adjust as needed
        db_session=db_session,
        skip_permission_check=True,
    )

    latest_message = (
        chat_messages[-1]
        if chat_messages
        else get_or_create_root_message(chat_session_id, db_session)
    )

    new_msg_req = CreateChatMessageRequest(
        chat_session_id=chat_session_id,
        parent_message_id=latest_message.id,
        message=instructions,
        file_descriptors=[],
        prompt_id=None,  # You might want to derive this from the assistant_id
        search_doc_ids=None,
        retrieval_options=RetrievalDetails(),  # Adjust as needed
        query_override=None,
        regenerate=None,
        llm_override=None,
        prompt_override=None,
        alternate_assistant_id=None,  # You might want to use assistant_id here
        use_existing_user_message=True,
    )

    try:
        for packet in stream_chat_message_objects(
            new_msg_req=new_msg_req,
            user=None,  # Adjust as needed
            db_session=db_session,
            use_existing_user_message=True,
        ):
            if isinstance(packet, ChatMessageDetail):
                # Update the run status and message content
                run_message = (
                    db_session.query(ChatMessage)
                    .filter(ChatMessage.id == run_id)
                    .first()
                )
                if run_message:
                    run_message.message = packet.message
                    run_message.message_type = MessageType.ASSISTANT
                    db_session.commit()
    except Exception as e:
        # Handle any errors
        latest_message.error = f"Error: {str(e)}"
        run_message.message_type = MessageType.ASSISTANT
        db_session.commit()


@router.post("/create")
def create_run(
    run_request: RunRequest,
    background_tasks: BackgroundTasks,
    user: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    try:
        chat_session = get_chat_session_by_id(
            chat_session_id=run_request.thread_id,
            user_id=user.id if user else None,
            db_session=db_session,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Thread not found")

    chat_messages = get_chat_messages_by_session(
        chat_session_id=chat_session.id,
        user_id=user.id if user else None,
        db_session=db_session,
    )
    latest_message = (
        chat_messages[-1]
        if chat_messages
        else get_or_create_root_message(chat_session.id, db_session)
    )

    # Create a new "run" (chat message) in the session
    new_message = ChatMessage(
        chat_session_id=chat_session.id,
        message="",
        token_count=0,
        message_type=MessageType.SYSTEM,
        parent_message=latest_message.id,
    )
    db_session.add(new_message)
    db_session.commit()

    # Schedule the background task
    background_tasks.add_task(
        process_run_in_background,
        str(new_message.id),
        chat_session.id,
        run_request.assistant_id,
        run_request.instructions or "",
        db_session,
    )

    return RunResponse(
        id=str(new_message.id),
        object="thread.run",
        created_at=int(new_message.time_sent.timestamp()),
        assistant_id=run_request.assistant_id,
        thread_id=chat_session.id,
        status="queued",
        model=run_request.model or "default_model",
        instructions=run_request.instructions or "",
        tools=run_request.tools or [],
        file_ids=[],
        metadata=run_request.metadata,
    )


@router.get("/{run_id}")
def retrieve_run(
    run_id: str,
    user: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    # Retrieve the chat message (which represents a "run" in DAnswer)
    chat_message = (
        db_session.query(ChatMessage).filter(ChatMessage.id == run_id).first()
    )
    if not chat_message:
        raise HTTPException(status_code=404, detail="Run not found")

    chat_session = chat_message.chat_session

    # Map DAnswer status to OpenAI status
    status_map = {
        "user": "completed",
        "assistant": "completed",
        "system": "in_progress",
    }

    return RunResponse(
        id=str(chat_message.id),
        object="thread.run",
        created_at=int(chat_message.time_sent.timestamp()),
        assistant_id=chat_session.persona_id or "default_assistant",
        thread_id=chat_session.id,
        status=status_map.get(chat_message.message_type, "queued"),
        started_at=int(chat_message.time_sent.timestamp()),
        completed_at=int(chat_message.time_sent.timestamp())
        if chat_message.message
        else None,
        model=chat_session.current_alternate_model or "default_model",
        instructions="",  # DAnswer doesn't store per-message instructions
        tools=[],  # DAnswer doesn't have a direct equivalent for tools
        file_ids=[file.id for file in chat_message.files] if chat_message.files else [],
        metadata=None,  # DAnswer doesn't store metadata for individual messages
    )


@router.post("/{run_id}/cancel")
def cancel_run(
    run_id: str,
    user: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> RunResponse:
    # In DAnswer, we don't have a direct equivalent to cancelling a run
    # We'll simulate it by marking the message as "cancelled"
    chat_message = (
        db_session.query(ChatMessage).filter(ChatMessage.id == run_id).first()
    )
    if not chat_message:
        raise HTTPException(status_code=404, detail="Run not found")

    chat_message.message = "Cancelled"
    db_session.commit()

    return retrieve_run(run_id, user, db_session)


@router.get("/thread/{thread_id}/runs")
def list_runs(
    thread_id: UUID,
    limit: int = 20,
    order: Literal["asc", "desc"] = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    user: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> list[RunResponse]:
    # In DAnswer, we'll treat each message in a chat session as a "run"
    chat_messages = get_chat_messages_by_session(
        chat_session_id=thread_id,
        user_id=user.id if user else None,
        db_session=db_session,
    )

    # Apply pagination
    if after:
        chat_messages = [msg for msg in chat_messages if str(msg.id) > after]
    if before:
        chat_messages = [msg for msg in chat_messages if str(msg.id) < before]

    # Apply ordering
    chat_messages = sorted(
        chat_messages, key=lambda msg: msg.time_sent, reverse=(order == "desc")
    )

    # Apply limit
    chat_messages = chat_messages[:limit]

    return [retrieve_run(str(msg.id), user, db_session) for msg in chat_messages]


@router.get("/{run_id}/steps")
def list_run_steps(
    run_id: str,
    limit: int = 20,
    order: Literal["asc", "desc"] = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    user: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> list[dict]:  # You may want to create a specific model for run steps
    # DAnswer doesn't have an equivalent to run steps
    # We'll return an empty list to maintain API compatibility
    return []


# Additional helper functions can be added here if needed
