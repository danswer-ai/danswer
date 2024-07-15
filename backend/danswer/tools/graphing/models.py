from typing import Optional

from pydantic import BaseModel


class GraphingResult(BaseModel):
    image: str


class GraphingResponse(BaseModel):
    revised_query: Optional[str] = None
    graph_result: GraphingResult


class GraphingError(BaseModel):
    error: str


class ToolResponse(BaseModel):
    id: Optional[str] = None
    response: GraphingResponse | GraphingError
