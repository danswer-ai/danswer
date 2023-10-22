from collections.abc import Iterable
from datetime import datetime
from datetime import timedelta

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import danswer.db.models as db_models
from danswer.auth.users import current_admin_user
from danswer.configs.constants import QAFeedbackType
from danswer.db.engine import get_session
from danswer.db.feedback import fetch_query_event_by_id
from danswer.db.models import Document
from ee.danswer.db.document import fetch_documents_from_ids
from ee.danswer.db.query_history import fetch_query_history


router = APIRouter()


class AbridgedSearchDoc(BaseModel):
    """A subset of the info present in `SearchDoc`"""

    document_id: str
    semantic_identifier: str
    link: str | None


class QuerySnapshot(BaseModel):
    id: int
    query: str
    llm_answer: str | None
    retrieved_documents: list[AbridgedSearchDoc]
    feedback: QAFeedbackType | None
    time_created: datetime

    @classmethod
    def build(
        cls, query_event: db_models.QueryEvent, documents: Iterable[Document]
    ) -> "QuerySnapshot":
        return cls(
            id=query_event.id,
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


@router.get("/admin/query-history")
def get_query_history(
    feedback_type: QAFeedbackType | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    _: db_models.User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[QuerySnapshot]:
    query_history = fetch_query_history(
        db_session=db_session,
        start=start
        or (datetime.utcnow() - timedelta(days=30)),  # default is 30d lookback
        end=end or datetime.utcnow(),
        feedback_type=feedback_type,
    )

    all_relevant_document_ids: set[str] = set()
    for query_event in query_history:
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
    for query_event in query_history:
        unique_document_ids = set(query_event.retrieved_document_ids or [])
        documents = [
            document_id_to_document[doc_id]
            for doc_id in unique_document_ids
            if doc_id in document_id_to_document
        ]
        query_snapshots.append(
            QuerySnapshot.build(query_event=query_event, documents=documents)
        )
    return query_snapshots


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
    return QuerySnapshot.build(query_event=query_event, documents=documents)
