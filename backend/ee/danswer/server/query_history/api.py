import csv
import io
from collections.abc import Iterable
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
from danswer.configs.constants import QAFeedbackType
from danswer.db.engine import get_session
from danswer.db.feedback import fetch_query_event_by_id
from danswer.db.models import Document
from ee.danswer.db.document import fetch_documents_from_ids
from ee.danswer.db.query_history import (
    fetch_query_history_with_user_email,
)


router = APIRouter()


class AbridgedSearchDoc(BaseModel):
    """A subset of the info present in `SearchDoc`"""

    document_id: str
    semantic_identifier: str
    link: str | None


class QuerySnapshot(BaseModel):
    id: int
    user_email: str | None
    query: str
    llm_answer: str | None
    retrieved_documents: list[AbridgedSearchDoc]
    feedback: QAFeedbackType | None
    time_created: datetime

    @classmethod
    def build(
        cls,
        query_event: db_models.QueryEvent,
        user_email: str | None,
        documents: Iterable[Document],
    ) -> "QuerySnapshot":
        return cls(
            id=query_event.id,
            user_email=user_email,
            query=query_event.query,
            llm_answer=query_event.llm_answer,
            retrieved_documents=[
                AbridgedSearchDoc(
                    document_id=document.id,
                    semantic_identifier=document.semantic_id,
                    link=document.link,
                )
                for document in documents
            ],
            feedback=query_event.feedback,
            time_created=query_event.time_created,
        )

    def to_json(self) -> dict[str, str]:
        return {
            "id": str(self.id),
            "query": self.query,
            "user_email": self.user_email or "",
            "llm_answer": self.llm_answer or "",
            "retrieved_documents": "|".join(
                [
                    doc.link or doc.semantic_identifier
                    for doc in self.retrieved_documents
                ]
            ),
            "feedback": self.feedback.value if self.feedback else "",
            "time_created": str(self.time_created),
        }


def fetch_and_process_query_history(
    db_session: Session,
    start: datetime | None,
    end: datetime | None,
    feedback_type: QAFeedbackType | None,
    limit: int | None = 500,
) -> list[QuerySnapshot]:
    query_history_with_user_email = fetch_query_history_with_user_email(
        db_session=db_session,
        start=start
        or (
            datetime.now(tz=timezone.utc) - timedelta(days=30)
        ),  # default is 30d lookback
        end=end or datetime.now(tz=timezone.utc),
        feedback_type=feedback_type,
        limit=limit,
    )

    all_relevant_document_ids: set[str] = set()
    for query_event, _ in query_history_with_user_email:
        all_relevant_document_ids = all_relevant_document_ids.union(
            query_event.retrieved_document_ids or []
        )
    document_id_to_document = {
        document.id: document
        for document in fetch_documents_from_ids(
            db_session, list(all_relevant_document_ids)
        )
    }

    query_snapshots: list[QuerySnapshot] = []
    for query_event, user_email in query_history_with_user_email:
        unique_document_ids = set(query_event.retrieved_document_ids or [])
        documents = [
            document_id_to_document[doc_id]
            for doc_id in unique_document_ids
            if doc_id in document_id_to_document
        ]
        query_snapshots.append(
            QuerySnapshot.build(
                query_event=query_event, user_email=user_email, documents=documents
            )
        )
    return query_snapshots


@router.get("/admin/query-history")
def get_query_history(
    feedback_type: QAFeedbackType | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[QuerySnapshot]:
    return fetch_and_process_query_history(
        db_session=db_session,
        start=start,
        end=end,
        feedback_type=feedback_type,
    )


@router.get("/admin/query-history/{query_id}")
def get_query(
    query_id: int,
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> QuerySnapshot:
    try:
        query_event = fetch_query_event_by_id(query_id=query_id, db_session=db_session)
    except ValueError:
        raise HTTPException(400, f"Query event with id '{query_id}' does not exist.")
    documents = fetch_documents_from_ids(
        db_session, query_event.retrieved_document_ids or []
    )
    return QuerySnapshot.build(
        query_event=query_event,
        user_email=query_event.user.email if query_event.user else None,
        documents=documents,
    )


@router.get("/admin/query-history-csv")
def get_query_history_as_csv(
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> StreamingResponse:
    complete_query_history = fetch_and_process_query_history(
        db_session=db_session,
        start=datetime.fromtimestamp(0, tz=timezone.utc),
        end=datetime.now(tz=timezone.utc),
        feedback_type=None,
        limit=None,
    )

    # Create an in-memory text stream
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=list(QuerySnapshot.__fields__.keys()))
    writer.writeheader()
    for row in complete_query_history:
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
