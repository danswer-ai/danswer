import uuid
from datetime import datetime
from typing import Literal
from typing import Optional

from fastapi import APIRouter
from fastapi import Depends
from pydantic import BaseModel
from pydantic import Field
from sqlalchemy.orm import Session

from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.server.danswer_api.ingestion import api_key_dep

router = APIRouter(prefix="/messages")


class MessageContent(BaseModel):
    type: Literal["text"]
    text: str


class Message(BaseModel):
    id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4()}")
    object: Literal["thread.message"] = "thread.message"
    created_at: int = Field(default_factory=lambda: int(datetime.now().timestamp()))
    thread_id: str
    role: Literal["user", "assistant"]
    content: list[MessageContent]
    file_ids: list[str] = []
    assistant_id: Optional[str] = None
    run_id: Optional[str] = None
    metadata: Optional[dict] = None


class CreateMessageRequest(BaseModel):
    role: Literal["user"]
    content: str
    file_ids: list[str] = []
    metadata: Optional[dict] = None


class ListMessagesResponse(BaseModel):
    object: Literal["list"] = "list"
    data: list[Message]
    first_id: str
    last_id: str
    has_more: bool


@router.post("/{thread_id}/messages")
def create_message(
    thread_id: str,
    message: CreateMessageRequest,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> Message:
    # Implementation for creating a message
    pass


@router.get("/{thread_id}/messages")
def list_messages(
    thread_id: str,
    limit: int = 20,
    order: Literal["asc", "desc"] = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> ListMessagesResponse:
    # Implementation for listing messages
    pass


@router.get("/{thread_id}/messages/{message_id}")
def retrieve_message(
    thread_id: str,
    message_id: str,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> Message:
    # Implementation for retrieving a specific message
    pass


@router.post("/{thread_id}/messages/{message_id}")
def modify_message(
    thread_id: str,
    message_id: str,
    metadata: dict,
    _: User | None = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> Message:
    # Implementation for modifying a message's metadata
    pass
