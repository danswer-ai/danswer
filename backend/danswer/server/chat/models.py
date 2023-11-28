from pydantic import BaseModel


class ChatSessionCreationRequest(BaseModel):
    persona_id: int | None = None
