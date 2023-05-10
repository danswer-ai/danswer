from typing import Any

from danswer.connectors.slack.pull import get_channel_info
from danswer.connectors.slack.pull import get_thread
from danswer.connectors.slack.pull import thread_to_doc
from danswer.connectors.slack.utils import get_client
from danswer.utils.indexing_pipeline import build_indexing_pipeline
from danswer.utils.logging import setup_logger
from fastapi import APIRouter
from pydantic import BaseModel
from pydantic import Extra

router = APIRouter()

logger = setup_logger()


class SlackEvent(BaseModel, extra=Extra.allow):
    type: str
    challenge: str | None
    event: dict[str, Any] | None


class EventHandlingResponse(BaseModel):
    challenge: str | None


@router.post("/process_slack_event", response_model=EventHandlingResponse)
def process_slack_event(event: SlackEvent):
    logger.info("Recieved slack event: %s", event.dict())

    if event.type == "url_verification":
        return {"challenge": event.challenge}

    if event.type == "event_callback" and event.event:
        try:
            # TODO: process in the background as per slack guidelines
            message_type = event.event.get("subtype")
            if message_type == "message_changed":
                message = event.event["message"]
            else:
                message = event.event

            channel_id = event.event["channel"]
            thread_ts = message.get("thread_ts")
            slack_client = get_client()
            doc = thread_to_doc(
                channel=get_channel_info(client=slack_client, channel_id=channel_id),
                thread=get_thread(
                    client=slack_client, channel_id=channel_id, thread_id=thread_ts
                )
                if thread_ts
                else [message],
            )
            if doc is None:
                logger.info("Message was determined to not be indexable")
                return {}

            build_indexing_pipeline()([doc])
        except Exception:
            logger.exception("Failed to process slack message")
        return {}

    logger.error("Unsupported event type: %s", event.type)
    return {}
