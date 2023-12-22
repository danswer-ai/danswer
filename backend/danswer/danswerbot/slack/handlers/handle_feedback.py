from slack_sdk import WebClient
from slack_sdk.models.views import View
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from sqlalchemy.orm import Session

from danswer.configs.constants import SearchFeedbackType
from danswer.danswerbot.slack.blocks import get_document_feedback_blocks
from danswer.danswerbot.slack.constants import DISLIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.constants import LIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.constants import VIEW_DOC_FEEDBACK_ID
from danswer.danswerbot.slack.utils import build_feedback_id
from danswer.danswerbot.slack.utils import decompose_feedback_id
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.feedback import create_chat_message_feedback
from danswer.db.feedback import create_doc_retrieval_feedback
from danswer.document_index.factory import get_default_document_index
from danswer.utils.logger import setup_logger

logger_base = setup_logger()


def handle_doc_feedback_button(
    req: SocketModeRequest,
    client: SocketModeClient,
) -> None:
    if not (actions := req.payload.get("actions")):
        logger_base.error("Missing actions. Unable to build the source feedback view")
        return

    # Extracts the feedback_id coming from the 'source feedback' button
    # and generates a new one for the View, to keep track of the doc info
    query_event_id, doc_id, doc_rank = decompose_feedback_id(actions[0].get("value"))
    external_id = build_feedback_id(query_event_id, doc_id, doc_rank)

    channel_id = req.payload["container"]["channel_id"]
    thread_ts = req.payload["container"]["thread_ts"]

    data = View(
        type="modal",
        callback_id=VIEW_DOC_FEEDBACK_ID,
        external_id=external_id,
        # We use the private metadata to keep track of the channel id and thread ts
        private_metadata=f"{channel_id}_{thread_ts}",
        title="Give Feedback",
        blocks=[get_document_feedback_blocks()],
        submit="send",
        close="cancel",
    )

    client.web_client.views_open(
        trigger_id=req.payload["trigger_id"], view=data.to_dict()
    )


def handle_slack_feedback(
    feedback_id: str,
    feedback_type: str,
    client: WebClient,
    user_id_to_post_confirmation: str,
    channel_id_to_post_confirmation: str,
    thread_ts_to_post_confirmation: str,
) -> None:
    engine = get_sqlalchemy_engine()

    message_id, doc_id, doc_rank = decompose_feedback_id(feedback_id)

    with Session(engine) as db_session:
        if feedback_type in [LIKE_BLOCK_ACTION_ID, DISLIKE_BLOCK_ACTION_ID]:
            create_chat_message_feedback(
                is_positive=feedback_type == LIKE_BLOCK_ACTION_ID,
                feedback_text="",
                chat_message_id=message_id,
                user_id=None,  # no "user" for Slack bot for now
                db_session=db_session,
            )
        elif feedback_type in [
            SearchFeedbackType.ENDORSE.value,
            SearchFeedbackType.REJECT.value,
            SearchFeedbackType.HIDE.value,
        ]:
            if doc_id is None or doc_rank is None:
                raise ValueError("Missing information for Document Feedback")

            if feedback_type == SearchFeedbackType.ENDORSE.value:
                feedback = SearchFeedbackType.ENDORSE
            elif feedback_type == SearchFeedbackType.REJECT.value:
                feedback = SearchFeedbackType.REJECT
            else:
                feedback = SearchFeedbackType.HIDE

            create_doc_retrieval_feedback(
                message_id=message_id,
                document_id=doc_id,
                document_rank=doc_rank,
                document_index=get_default_document_index(),
                db_session=db_session,
                clicked=False,  # Not tracking this for Slack
                feedback=feedback,
            )
        else:
            logger_base.error(f"Feedback type '{feedback_type}' not supported")

    # post message to slack confirming that feedback was received
    client.chat_postEphemeral(
        channel=channel_id_to_post_confirmation,
        user=user_id_to_post_confirmation,
        thread_ts=thread_ts_to_post_confirmation,
        text="Thanks for your feedback!",
    )
