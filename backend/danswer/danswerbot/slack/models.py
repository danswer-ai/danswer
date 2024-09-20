from onyx.one_shot_answer.models import ThreadMessage
from pydantic import BaseModel


class SlackMessageInfo(BaseModel):
    thread_messages: list[ThreadMessage]
    channel_to_respond: str
    msg_to_respond: str | None
    thread_to_respond: str | None
    sender: str | None
    email: str | None
    bypass_filters: bool  # User has tagged @onyxBot
    is_bot_msg: bool  # User is using /onyxBot
    is_bot_dm: bool  # User is direct messaging to onyxBot
