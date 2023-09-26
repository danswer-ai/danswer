import logging
from collections.abc import MutableMapping
from typing import Any
from typing import cast

from slack_sdk import WebClient
from slack_sdk.socket_mode import SocketModeClient
from slack_sdk.socket_mode.request import SocketModeRequest
from slack_sdk.socket_mode.response import SocketModeResponse

from danswer.bots.slack.handlers.handle_feedback import handle_slack_feedback
from danswer.bots.slack.handlers.handle_message import handle_message
from danswer.bots.slack.utils import decompose_block_id
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.slack_bot_management import get_tokens
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
    try:
        slack_bot_tokens = get_tokens()
    except ConfigNotFoundError:
        raise RuntimeError("Slack tokens not found")
    return SocketModeClient(
        # This app-level token will be used only for establishing a connection
        app_token=slack_bot_tokens.app_token,
        web_client=WebClient(token=slack_bot_tokens.bot_token),
    )


def _process_slack_event(client: SocketModeClient, req: SocketModeRequest) -> None:
    logger.info(f"Received Slack request of type: '{req.type}'")
    if req.type == "events_api":
        # Acknowledge the request immediately
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
            channel_specific_logger.error("Found message without channel - skipping")
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
        # Pick the root of the thread (if a thread exists)
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
        handle_message(
            msg=msg,
            channel=channel,
            message_ts_to_respond_to=message_ts_to_respond_to,
            client=client.web_client,
            logger=cast(logging.Logger, channel_specific_logger),
        )

        channel_specific_logger.info(
            f"Successfully processed message with ts: '{message_ts}'"
        )

    # Handle button clicks
    if req.type == "interactive" and req.payload.get("type") == "block_actions":
        # Acknowledge the request immediately
        response = SocketModeResponse(envelope_id=req.envelope_id)
        client.send_socket_mode_response(response)

        actions = req.payload.get("actions")
        if not actions:
            logger.error("Unable to process block actions - no actions found")
            return

        action = cast(dict[str, Any], actions[0])
        action_id = cast(str, action.get("action_id"))
        block_id = cast(str, action.get("block_id"))
        user_id = cast(str, req.payload["user"]["id"])
        channel_id = cast(str, req.payload["container"]["channel_id"])
        thread_ts = cast(str, req.payload["container"]["thread_ts"])

        handle_slack_feedback(
            block_id=block_id,
            feedback_type=action_id,
            client=client.web_client,
            user_id_to_post_confirmation=user_id,
            channel_id_to_post_confirmation=channel_id,
            thread_ts_to_post_confirmation=thread_ts,
        )

        query_event_id, _, _ = decompose_block_id(block_id)
        logger.info(f"Successfully handled QA feedback for event: {query_event_id}")


def process_slack_event(client: SocketModeClient, req: SocketModeRequest) -> None:
    try:
        _process_slack_event(client=client, req=req)
    except Exception:
        logger.exception("Failed to process slack event")


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
