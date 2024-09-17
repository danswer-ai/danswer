from enum import Enum
from typing import Any

from pydantic import BaseModel


class GraphGenerationDisplay(BaseModel):
    file_id: str
    line_graph: bool


class GraphType(str, Enum):
    BAR_CHART = "bar_chart"
    LINE_GRAPH = "line_graph"


class GraphingResponse(BaseModel):
    file_id: str
    plot_data: dict[str, Any] | None
    graph_type: GraphType


class GraphingError(BaseModel):
    error: str


GRAPHING_RESPONSE_ID = "graphing_response"
