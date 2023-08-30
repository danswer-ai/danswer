import logging
import os
from collections.abc import MutableMapping
from typing import Any
from typing import cast

from retry import retry
from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.socket_mode.response import SocketModeResponse
from sqlalchemy.orm import Session

from danswer.bots.slack.blocks import build_qa_response_blocks
from danswer.bots.slack.utils import respond_in_thread
from danswer.configs.app_configs import DANSWER_BOT_ANSWER_GENERATION_TIMEOUT
from danswer.configs.app_configs import DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER
from danswer.configs.app_configs import DANSWER_BOT_DISPLAY_ERROR_MSGS
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.app_configs import DOCUMENT_INDEX_NAME
from danswer.db.engine import get_sqlalchemy_engine
from danswer.direct_qa.answer_question import answer_qa_query
from danswer.server.models import QAResponse
from danswer.server.models import QuestionRequest
from danswer.utils.logger import setup_logger

logger = setup_logger()


_CHANNEL_ID = "channel_id"


class _ChannelIdAdapter(logging.LoggerAdapter):
    """This is used to add the channel ID to all log messages
    emitted in this file"""

    def process(
        self, msg: str, kwargs: MutableMapping[str, Any]
    ) -> tuple[str, MutableMapping[str, Any]]:
        channel_id = self.extra.get(_CHANNEL_ID) if self.extra else None
        if channel_id:
            return f"[Channel ID: {channel_id}] {msg}", kwargs
        else:
            return msg, kwargs


def _get_socket_client() -> SocketModeClient:
    # For more info on how to set this up, checkout the docs:
    # https://docs.danswer.dev/slack_bot_setup
    app_token = os.environ.get("DANSWER_BOT_SLACK_APP_TOKEN")
    if not app_token:
        raise RuntimeError("DANSWER_BOT_SLACK_APP_TOKEN is not set")
    bot_token = os.environ.get("DANSWER_BOT_SLACK_BOT_TOKEN")
    if not bot_token:
        raise RuntimeError("DANSWER_BOT_SLACK_BOT_TOKEN is not set")
    return SocketModeClient(
        # This app-level token will be used only for establishing a connection
        app_token=app_token,
        web_client=WebClient(token=bot_token),
    )


def process_slack_event(client: SocketModeClient, req: SocketModeRequest) -> None:
    logger.info(f"Received request of type: '{req.type}', with paylod: '{req.payload}'")
    if req.type == "events_api":
        # Acknowledge the request anyway
        response = SocketModeResponse(envelope_id=req.envelope_id)
        client.send_socket_mode_response(response)

        event = cast(dict[str, Any], req.payload.get("event", {}))
        channel = cast(str | None, event.get("channel"))
        channel_specific_logger = _ChannelIdAdapter(
            logger, extra={_CHANNEL_ID: channel}
        )

        # Ensure that the message is a new message + of expected type
        event_type = event.get("type")
        if event_type != "message":
            channel_specific_logger.info(
                f"Ignoring non-message event of type '{event_type}' for channel '{channel}'"
            )

        # this should never happen, but we can't continue without a channel since
        # we can't send a response without it
        if not channel:
            channel_specific_logger.error(f"Found message without channel - skipping")
            return

        message_subtype = event.get("subtype")
        # ignore things like channel_join, channel_leave, etc.
        # NOTE: "file_share" is just a message with a file attachment, so we
        # should not ignore it
        if message_subtype not in [None, "file_share"]:
            channel_specific_logger.info(
                f"Ignoring message with subtype '{message_subtype}' since is is a special message type"
            )
            return

        if event.get("bot_profile"):
            channel_specific_logger.info("Ignoring message from bot")
            return

        message_ts = event.get("ts")
        thread_ts = event.get("thread_ts")
        # pick the root of the thread (if a thread exists)
        message_ts_to_respond_to = cast(str, thread_ts or message_ts)
        if thread_ts and message_ts != thread_ts:
            channel_specific_logger.info(
                "Skipping message since it is not the root of a thread"
            )
            return

        msg = cast(str | None, event.get("text"))
        if not msg:
            channel_specific_logger.error("Unable to process empty message")
            return

        # TODO: message should be enqueued and processed elsewhere,
        # but doing it here for now for simplicity

        @retry(
            tries=DANSWER_BOT_NUM_RETRIES,
            delay=0.25,
            backoff=2,
            logger=cast(logging.Logger, logger),
        )
        def _get_answer(question: QuestionRequest) -> QAResponse:
            engine = get_sqlalchemy_engine()
            with Session(engine, expire_on_commit=False) as db_session:
                answer = answer_qa_query(
                    question=question,
                    user=None,
                    db_session=db_session,
                    answer_generation_timeout=DANSWER_BOT_ANSWER_GENERATION_TIMEOUT,
                )
                if not answer.error_msg:
                    return answer
                else:
                    raise RuntimeError(answer.error_msg)

        try:
            answer = _get_answer(
                QuestionRequest(
                    query=msg,
                    collection=DOCUMENT_INDEX_NAME,
                    use_keyword=None,
                    filters=None,
                    offset=None,
                )
            )
        except Exception as e:
            channel_specific_logger.exception(
                f"Unable to process message - did not successfully answer "
                f"in {DANSWER_BOT_NUM_RETRIES} attempts"
            )
            # Optionally, respond in thread with the error message, Used primarily
            # for debugging purposes
            if DANSWER_BOT_DISPLAY_ERROR_MSGS:
                respond_in_thread(
                    client=client.web_client,
                    channel=channel,
                    text=f"Encountered exception when trying to answer: \n\n```{e}```",
                    thread_ts=message_ts_to_respond_to,
                )
            return

        if not answer.top_ranked_docs:
            channel_specific_logger.error(
                f"Unable to answer question: '{msg}' - no documents found"
            )
            # Optionally, respond in thread with the error message, Used primarily
            # for debugging purposes
            if DANSWER_BOT_DISPLAY_ERROR_MSGS:
                respond_in_thread(
                    client=client.web_client,
                    channel=channel,
                    text="Found no documents when trying to answer. Did you index any documents?",
                    thread_ts=message_ts_to_respond_to,
                )
            return

        if not answer.answer and DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER:
            channel_specific_logger.info(
                "Unable to find answer - not responding since the "
                "`DANSWER_BOT_DISABLE_DOCS_ONLY_ANSWER` env variable is set"
            )
            return

        # convert raw response into "nicely" formatted Slack message
        blocks = build_qa_response_blocks(
            answer=answer.answer, documents=answer.top_ranked_docs, quotes=answer.quotes
        )
        try:
            respond_in_thread(
                client=client.web_client,
                channel=channel,
                blocks=blocks,
                thread_ts=message_ts_to_respond_to,
            )
        except Exception:
            channel_specific_logger.exception(
                f"Unable to process message - could not respond in slack in {DANSWER_BOT_NUM_RETRIES} attempts"
            )
            return

        channel_specific_logger.info(
            f"Successfully processed message with ts: '{message_ts}'"
        )


# Follow the guide (https://docs.danswer.dev/slack_bot_setup) to set up
# the slack bot in your workspace, and then add the bot to any channels you want to
# try and answer questions for. Running this file will setup Danswer to listen to all
# messages in those channels and attempt to answer them. As of now, it will only respond
# to messages sent directly in the channel - it will not respond to messages sent within a
# thread.
#
# NOTE: we are using Web Sockets so that you can run this from within a firewalled VPC
# without issue.
if __name__ == "__main__":
    socket_client = _get_socket_client()
    socket_client.socket_mode_request_listeners.append(process_slack_event)  # type: ignore
    # Establish a WebSocket connection to the Socket Mode servers
    logger.info("Listening for messages from Slack...")
    socket_client.connect()

    # Just not to stop this process
    from threading import Event

    Event().wait()
