from pydantic import BaseModel


class ServerStatus(BaseModel):
    status: str


class QAQuestion(BaseModel):
    query: str
    collection: str


class QAResponse(BaseModel):
    answer: str | None
    quotes: dict[str, dict[str, str | int | None]] | None


class KeywordResponse(BaseModel):
    results: list[str] | None
