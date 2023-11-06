from pydantic import BaseModel


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class RerankRequest(BaseModel):
    query: str
    documents: list[str]


class RerankResponse(BaseModel):
    scores: list[list[float]]


class IntentRequest(BaseModel):
    query: str


class IntentResponse(BaseModel):
    class_probs: list[float]
