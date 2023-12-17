import csv
import io
from collections import defaultdict
from datetime import datetime
from datetime import timedelta
from datetime import timezone

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import danswer.db.models as db_models
from danswer.auth.users import current_admin_user
from danswer.configs.constants import MessageType
from danswer.configs.constants import QAFeedbackType
from danswer.db.chat import get_chat_session_by_id
from danswer.db.engine import get_session
from danswer.db.models import ChatMessage
from ee.danswer.db.query_history import (
    fetch_query_history_with_user_email,
)


router = APIRouter()


class AbridgedSearchDoc(BaseModel):
    """A subset of the info present in `SearchDoc`"""

    document_id: str
    semantic_identifier: str
    link: str | None


class MessageSnapshot(BaseModel):
    message: str
    message_type: MessageType
    documents: list[AbridgedSearchDoc]
    feedback: QAFeedbackType | None
    time_created: datetime

    @classmethod
    def build(cls, message: ChatMessage) -> "MessageSnapshot":
        latest_messages_feedback_obj = (
            message.chat_message_feedbacks[-1]
            if len(message.chat_message_feedbacks) > 0
            else None
        )
        message_feedback = (
            (
                QAFeedbackType.LIKE
                if latest_messages_feedback_obj.is_positive
                else QAFeedbackType.DISLIKE
            )
            if latest_messages_feedback_obj
            else None
        )

        return cls(
            message=message.message,
            message_type=message.message_type,
            documents=[
                AbridgedSearchDoc(
                    document_id=document.document_id,
                    semantic_identifier=document.semantic_id,
                    link=document.link,
                )
                for document in message.search_docs
            ],
            feedback=message_feedback,
            time_created=message.time_sent,
        )


class ChatSessionSnapshot(BaseModel):
    id: int
    user_email: str | None
    name: str | None
    messages: list[MessageSnapshot]
    time_created: datetime

    @classmethod
    def build(
        cls,
        messages: list[ChatMessage],
    ) -> "ChatSessionSnapshot":
        if len(messages) == 0:
            raise ValueError("No messages provided")

        chat_session = messages[0].chat_session

        return cls(
            id=chat_session.id,
            user_email=chat_session.user.email if chat_session.user else None,
            name=chat_session.description,
            messages=[
                MessageSnapshot.build(message)
                for message in sorted(messages, key=lambda m: m.time_sent)
                if message.message_type != MessageType.SYSTEM
            ],
            time_created=chat_session.time_created,
        )


class QuestionAnswerPairSnapshot(BaseModel):
    user_message: str
    ai_response: str
    retrieved_documents: list[AbridgedSearchDoc]
    feedback: QAFeedbackType | None
    time_created: datetime

    @classmethod
    def from_chat_session_snapshot(
        cls,
        chat_session_snapshot: ChatSessionSnapshot,
    ) -> list["QuestionAnswerPairSnapshot"]:
        message_pairs: list[tuple[MessageSnapshot, MessageSnapshot]] = []
        for ind in range(1, len(chat_session_snapshot.messages), 2):
            message_pairs.append(
                (
                    chat_session_snapshot.messages[ind - 1],
                    chat_session_snapshot.messages[ind],
                )
            )

        return [
            cls(
                user_message=user_message.message,
                ai_response=ai_message.message,
                retrieved_documents=ai_message.documents,
                feedback=ai_message.feedback,
                time_created=user_message.time_created,
            )
            for user_message, ai_message in message_pairs
        ]

    def to_json(self) -> dict[str, str]:
        return {
            "user_message": self.user_message,
            "ai_response": self.ai_response,
            "retrieved_documents": "|".join(
                [
                    doc.link or doc.semantic_identifier
                    for doc in self.retrieved_documents
                ]
            ),
            "feedback": self.feedback.value if self.feedback else "",
            "time_created": str(self.time_created),
        }


def fetch_and_process_chat_session_history(
    db_session: Session,
    start: datetime | None,
    end: datetime | None,
    feedback_type: QAFeedbackType | None,
    limit: int | None = 500,
) -> list[ChatSessionSnapshot]:
    chat_messages_with_user_email = fetch_query_history_with_user_email(
        db_session=db_session,
        start=start
        or (
            datetime.now(tz=timezone.utc) - timedelta(days=30)
        ),  # default is 30d lookback
        end=end or datetime.now(tz=timezone.utc),
        limit=limit,
    )
    session_id_to_messages: dict[int, list[ChatMessage]] = defaultdict(list)
    for message, _ in chat_messages_with_user_email:
        session_id_to_messages[message.chat_session_id].append(message)

    chat_session_snapshots = [
        ChatSessionSnapshot.build(messages)
        for messages in session_id_to_messages.values()
    ]
    if feedback_type:
        chat_session_snapshots = [
            chat_session_snapshot
            for chat_session_snapshot in chat_session_snapshots
            if any(
                message.feedback == feedback_type
                for message in chat_session_snapshot.messages
            )
        ]

    return chat_session_snapshots


@router.get("/admin/chat-session-history")
def get_chat_session_history(
    feedback_type: QAFeedbackType | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[ChatSessionSnapshot]:
    return fetch_and_process_chat_session_history(
        db_session=db_session,
        start=start,
        end=end,
        feedback_type=feedback_type,
    )


@router.get("/admin/chat-session-history/{chat_session_id}")
def get_chat_session(
    chat_session_id: int,
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> ChatSessionSnapshot:
    try:
        chat_session = get_chat_session_by_id(
            chat_session_id=chat_session_id, user_id=None, db_session=db_session
        )
    except ValueError:
        raise HTTPException(
            400, f"Chat session with id '{chat_session_id}' does not exist."
        )

    return ChatSessionSnapshot.build(messages=chat_session.messages)


@router.get("/admin/query-history-csv")
def get_query_history_as_csv(
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    complete_chat_session_history = fetch_and_process_chat_session_history(
        db_session=db_session,
        start=datetime.fromtimestamp(0, tz=timezone.utc),
        end=datetime.now(tz=timezone.utc),
        feedback_type=None,
        limit=None,
    )

    question_answer_pairs: list[QuestionAnswerPairSnapshot] = []
    for chat_session_snapshot in complete_chat_session_history:
        question_answer_pairs.extend(
            QuestionAnswerPairSnapshot.from_chat_session_snapshot(chat_session_snapshot)
        )

    # Create an in-memory text stream
    stream = io.StringIO()
    writer = csv.DictWriter(
        stream, fieldnames=list(QuestionAnswerPairSnapshot.__fields__.keys())
    )
    writer.writeheader()
    for row in question_answer_pairs:
        writer.writerow(row.to_json())

    # Reset the stream's position to the start
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment;filename=danswer_query_history.csv"
        },
    )
