import datetime

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import MessageType
from danswer.db.models import ChatMessage
from danswer.db.models import ChatSession


class ChatMessageSkeleton(BaseModel):
    message_id: int
    chat_session_id: int
    time_sent: datetime.datetime

    def __init__(
        self, message_id: int, chat_session_id: int, time_sent: datetime.datetime
    ) -> None:
        self.message_id = message_id
        self.chat_session_id = chat_session_id
        self.time_sent = time_sent


# Gets skeletons of all message
# TODO: should change this to use a key index with dates
# TODO: Need to paginate as well
def get_empty_chat_messages_entries(
    db_session: Session,
) -> list[ChatMessageSkeleton]:
    stmt = select(
        ChatMessage.id, ChatMessage.chat_session_id, ChatMessage.time_sent
    ).where(ChatMessage.message_type == MessageType.USER)

    result = db_session.execute(stmt).all()

    return [
        ChatMessageSkeleton(
            message_id=m.id, chat_session_id=m.chat_session_id, time_sent=m.time_sent
        )
        for m in result
    ]


class ChatSessionSkeleton(BaseModel):
    session_id: int
    user_id: int
    one_shot: bool
    time_created: datetime.datetime
    time_updated: datetime.datetime

    def __init__(
        self,
        session_id: int,
        user_id: int,
        one_shot: bool,
        time_created: datetime.datetime,
        time_updated: datetime.datetime,
    ) -> None:
        self.session_id = session_id
        self.user_id = user_id
        self.one_shot = one_shot
        self.time_created = time_created
        self.time_updated = time_updated


def get_chat_sessions_skeleton(
    db_session: Session,
) -> list[ChatSessionSkeleton]:
    stmt = select(
        ChatSession.id,
        ChatSession.user_id,
        ChatSession.one_shot,
        ChatSession.time_created,
        ChatSession.time_updated,
    )

    result = db_session.execute(stmt).all()

    return [
        ChatSessionSkeleton(
            session_id=s.id,
            user_id=s.user_id,
            one_shot=s.one_shot,
            time_created=s.time_created,
            time_updated=s.time_updated,
        )
        for s in result
    ]
