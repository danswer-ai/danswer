from pydantic import BaseModel


class GraphingResult(BaseModel):
    image: str


class GraphDisplay(BaseModel):
    file_id: str
    line_graph: bool


class GraphGenerationDisplay(BaseModel):
    file_id: str
    line_graph: bool


class GraphingResponse(BaseModel):
    revised_query: str | None = None
    graph_result: GraphingResult
    extra_graph_display: GraphGenerationDisplay | None


class GraphingError(BaseModel):
    error: str


GRAPHING_RESPONSE_ID = "graphing_response"
