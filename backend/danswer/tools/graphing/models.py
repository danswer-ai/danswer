from pydantic import BaseModel


class GraphingResult(BaseModel):
    image: str


class GraphingResponse(BaseModel):
    revised_query: str | None = None
    graph_result: GraphingResult


class GraphingError(BaseModel):
    error: str


GRAPHING_RESPONSE_ID = "graphing_response"
