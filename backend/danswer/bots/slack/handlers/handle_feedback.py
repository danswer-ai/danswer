from slack_sdk import WebClient
from sqlalchemy.orm import Session

from danswer.configs.constants import QAFeedbackType
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.feedback import update_query_event_feedback


def handle_qa_feedback(
    query_id: int,
    feedback_type: QAFeedbackType,
    client: WebClient,
    user_id_to_post_confirmation: str,
    channel_id_to_post_confirmation: str,
    thread_ts_to_post_confirmation: str,
) -> None:
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        update_query_event_feedback(
            feedback=feedback_type,
            query_id=query_id,
            user_id=None,  # no "user" for Slack bot for now
            db_session=db_session,
        )

    # post message to slack confirming that feedback was received
    client.chat_postEphemeral(
        channel=channel_id_to_post_confirmation,
        user=user_id_to_post_confirmation,
        thread_ts=thread_ts_to_post_confirmation,
        text="Thanks for your feedback!",
    )
