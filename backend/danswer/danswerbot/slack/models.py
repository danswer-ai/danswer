from pydantic import BaseModel


class SlackMessageInfo(BaseModel):
    msg_content: str
    channel_to_respond: str
    msg_to_respond: str | None
    sender: str | None
    bypass_filters: bool  # User has tagged @DanswerBot
    is_bot_msg: bool  # User is using /DanswerBot
    is_bot_dm: bool  # User is direct messaging to DanswerBot
