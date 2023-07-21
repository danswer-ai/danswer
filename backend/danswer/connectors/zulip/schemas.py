from pydantic import BaseModel, EmailStr
from typing import List, Any

class Recipient(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_mirror_dummy: bool

class Message(BaseModel):
    id: int
    sender_id: int
    content: str
    recipient_id: int
    timestamp: int
    client: str
    is_me_message: bool
    sender_full_name: str
    sender_email: str
    sender_realm_str: str
    subject: str = None
    topic_links: List[Any] = None
    last_edit_timestamp: int = None
    edit_history: Any = None
    reactions: List[Any] = None
    submessages: List[Any] = None
    flags: List[str] = None
    display_recipient: str = None
    type: str = None
    stream_id: int = None
    avatar_url: str = None
    content_type: str = None
    rendered_content: str = None

class GetMessagesResponse(BaseModel):
    result: str
    msg: str
    found_anchor: bool = None
    found_oldest: bool = None
    found_newest: bool = None
    history_limited: bool = None
    anchor: int = None
    messages: List[Message] = None