from uuid import UUID

from sqlalchemy import asc
from sqlalchemy import delete
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SearchFeedbackType
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import UpdateRequest
from danswer.db.models import Document as DbDocument
from danswer.db.models import DocumentRetrievalFeedback
from danswer.db.models import QueryEvent
from danswer.search.models import SearchType


def fetch_query_event_by_id(query_id: int, db_session: Session) -> QueryEvent:
    stmt = select(QueryEvent).where(QueryEvent.id == query_id)
    result = db_session.execute(stmt)
    query_event = result.scalar_one_or_none()

    if not query_event:
        raise ValueError("Invalid Query Event ID Provided")

    return query_event


def fetch_docs_by_id(doc_id: str, db_session: Session) -> DbDocument:
    stmt = select(DbDocument).where(DbDocument.id == doc_id)
    result = db_session.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise ValueError("Invalid Document ID Provided")

    return doc


def fetch_docs_ranked_by_boost(
    db_session: Session, ascending: bool = False, limit: int = 100
) -> list[DbDocument]:
    order_func = asc if ascending else desc
    stmt = select(DbDocument).order_by(order_func(DbDocument.boost)).limit(limit)
    result = db_session.execute(stmt)
    doc_list = result.scalars().all()

    return list(doc_list)


def update_document_boost(db_session: Session, document_id: str, boost: int) -> None:
    stmt = select(DbDocument).where(DbDocument.id == document_id)
    result = db_session.execute(stmt).scalar_one_or_none()
    if result is None:
        raise ValueError(f"No document found with ID: '{document_id}'")

    result.boost = boost

    update = UpdateRequest(
        document_ids=[document_id],
        boost=boost,
    )

    get_default_document_index().update([update])

    db_session.commit()


def create_query_event(
    query: str,
    selected_flow: SearchType | None,
    llm_answer: str | None,
    user_id: UUID | None,
    db_session: Session,
) -> int:
    query_event = QueryEvent(
        query=query,
        selected_search_flow=selected_flow,
        llm_answer=llm_answer,
        user_id=user_id,
    )
    db_session.add(query_event)
    db_session.commit()

    return query_event.id


def update_query_event_feedback(
    feedback: QAFeedbackType,
    query_id: int,
    user_id: UUID | None,
    db_session: Session,
) -> None:
    query_event = fetch_query_event_by_id(query_id, db_session)

    if user_id != query_event.user_id:
        raise ValueError("User trying to give feedback on a query run by another user.")

    query_event.feedback = feedback

    db_session.commit()


def create_doc_retrieval_feedback(
    qa_event_id: int,
    document_id: str,
    document_rank: int,
    user_id: UUID | None,
    db_session: Session,
    clicked: bool = False,
    feedback: SearchFeedbackType | None = None,
) -> None:
    """Creates a new Document feedback row and updates the boost value in Postgres and Vespa"""
    if not clicked and feedback is None:
        raise ValueError("No action taken, not valid feedback")

    query_event = fetch_query_event_by_id(qa_event_id, db_session)

    if user_id != query_event.user_id:
        raise ValueError("User trying to give feedback on a query run by another user.")

    doc_m = fetch_docs_by_id(document_id, db_session)

    retrieval_feedback = DocumentRetrievalFeedback(
        qa_event_id=qa_event_id,
        document_id=document_id,
        document_rank=document_rank,
        clicked=clicked,
        feedback=feedback,
    )

    if feedback is not None:
        if feedback == SearchFeedbackType.ENDORSE:
            doc_m.boost += 1
        elif feedback == SearchFeedbackType.REJECT:
            doc_m.boost -= 1
        elif feedback == SearchFeedbackType.HIDE:
            doc_m.hidden = True
        elif feedback == SearchFeedbackType.UNHIDE:
            doc_m.hidden = False
        else:
            raise ValueError("Unhandled document feedback type")

    if feedback in [SearchFeedbackType.ENDORSE, SearchFeedbackType.REJECT]:
        document_index = get_default_document_index()
        update = UpdateRequest(
            document_ids=[document_id],
            boost=doc_m.boost,
        )
        # Updates are generally batched for efficiency, this case only 1 doc/value is updated
        document_index.update([update])

    db_session.add(retrieval_feedback)
    db_session.commit()


def delete_document_feedback_for_documents(
    document_ids: list[str], db_session: Session
) -> None:
    """NOTE: does not commit transaction so that this can be used as part of a
    larger transaction block."""
    stmt = delete(DocumentRetrievalFeedback).where(
        DocumentRetrievalFeedback.document_id.in_(document_ids)
    )
    db_session.execute(stmt)
