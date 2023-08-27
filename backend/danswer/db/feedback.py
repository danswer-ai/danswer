from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SearchFeedbackType
from danswer.db.models import DocumentMetadata
from danswer.db.models import DocumentRetrievalFeedback
from danswer.db.models import QueryEvent
from danswer.search.models import SearchType


def fetch_query_event_by_id(query_id: int, db_session: Session) -> QueryEvent:
    stmt = select(QueryEvent).where(QueryEvent.id == query_id)
    result = db_session.execute(stmt)
    query_event = result.scalar_one_or_none()

    if not query_event:
        raise ValueError("Invalid Query Event provided for updating")

    return query_event


def fetch_doc_m_by_id(doc_id: str, db_session: Session) -> DocumentMetadata:
    stmt = select(DocumentMetadata).where(DocumentMetadata.id == doc_id)
    result = db_session.execute(stmt)
    doc_m = result.scalar_one_or_none()

    if not doc_m:
        raise ValueError("Invalid Document provided for updating")

    return doc_m


def create_document_metadata(
    doc_id: str,
    semantic_id: str,
    link: str | None,
    db_session: Session,
) -> None:
    try:
        fetch_doc_m_by_id(doc_id, db_session)
        return
    except ValueError:
        # Document already exists, don't reset its data
        pass

    DocumentMetadata(
        id=doc_id,
        semantic_id=semantic_id,
        link=link,
    )


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
    db_session: Session,
    clicked: bool = False,
    feedback: SearchFeedbackType | None = None,
) -> None:
    if not clicked and feedback is None:
        raise ValueError("No action taken, not valid feedback")

    # Ensure this query event is valid so we hit exception here
    # instead of a more confusing foreign key issue
    fetch_query_event_by_id(qa_event_id, db_session)

    doc_m = fetch_doc_m_by_id(document_id, db_session)

    DocumentRetrievalFeedback(
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

    # TODO UPDATE INDEX BOOST

    db_session.commit()
