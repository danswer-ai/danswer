from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.feedback import update_query_event_feedback


def handle_qa_feedback(query_id: int, feedback_type: QAFeedbackType) -> None:
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        update_query_event_feedback(
            feedback=feedback_type,
            query_id=query_id,
            user_id=None,  # no "user" for Slack bot for now
            db_session=db_session,
        )
