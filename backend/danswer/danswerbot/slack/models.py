from pydantic import BaseModel

from danswer.one_shot_answer.models import ThreadMessage


class SlackMessageInfo(BaseModel):
    thread_messages: list[ThreadMessage]
    channel_to_respond: str
    msg_to_respond: str | None
    sender: str | None
    bipass_filters: bool
    is_bot_msg: bool
