from pydantic import BaseModel


class SlackMessageInfo(BaseModel):
    msg_content: str
    channel_to_respond: str
    msg_to_respond: str | None
    sender: str | None
    bipass_filters: bool
    is_bot_msg: bool
