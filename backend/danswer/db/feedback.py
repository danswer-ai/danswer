from uuid import UUID

from sqlalchemy import asc
from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.configs.constants import SearchFeedbackType
from danswer.datastores.datastore_utils import translate_boost_count_to_multiplier
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
        raise ValueError("Invalid Query Event provided for updating")

    return query_event


def fetch_doc_m_by_id(doc_id: str, db_session: Session) -> DbDocument:
    stmt = select(DbDocument).where(DbDocument.id == doc_id)
    result = db_session.execute(stmt)
    doc_m = result.scalar_one_or_none()

    if not doc_m:
        raise ValueError("Invalid Document provided for updating")

    return doc_m


def fetch_docs_ranked_by_boost(
    db_session: Session, ascending: bool = False, limit: int = 100
) -> list[DbDocument]:
    order_func = asc if ascending else desc
    stmt = select(DbDocument).order_by(order_func(DbDocument.boost)).limit(limit)
    result = db_session.execute(stmt)
    doc_m_list = result.scalars().all()

    return list(doc_m_list)


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

    DbDocument(
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
    user_id: UUID | None,
    db_session: Session,
    clicked: bool = False,
    feedback: SearchFeedbackType | None = None,
) -> None:
    if not clicked and feedback is None:
        raise ValueError("No action taken, not valid feedback")

    query_event = fetch_query_event_by_id(qa_event_id, db_session)

    if user_id != query_event.user_id:
        raise ValueError("User trying to give feedback on a query run by another user.")

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

    if feedback in [SearchFeedbackType.ENDORSE, SearchFeedbackType.REJECT]:
        document_index = get_default_document_index()
        update = UpdateRequest(
            document_ids=[document_id],
            boost=translate_boost_count_to_multiplier(doc_m.boost),
        )
        # Updates are generally batched for efficiency, this case only 1 doc/value is updated
        document_index.update([update])

    db_session.commit()
