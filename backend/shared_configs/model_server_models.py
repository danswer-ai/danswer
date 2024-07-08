from pydantic import BaseModel


class EmbedRequest(BaseModel):
    # This already includes any prefixes, the text is just passed directly to the model
    texts: list[str]
    model_name: str | None
    max_context_length: int
    normalize_embeddings: bool
    api_key: str | None
    provider_type: str | None


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
