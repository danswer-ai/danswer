from pydantic import BaseModel


class ChatContext(BaseModel):
    system_text: str | None
    tools_text: str | None
    hint_text: str | None
