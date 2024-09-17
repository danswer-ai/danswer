from enum import Enum

from pydantic import BaseModel


class GraphGenerationDisplay(BaseModel):
    file_id: str
    line_graph: bool


class GraphType(Enum):
    BAR_CHART = "bar_chart"
    LINE_GRAPH = "line_graph"
    # SCATTER_PLOT = "scatter_plot"
    # PIE_CHART = "pie_chart"
    # HISTOGRAM = "histogram"


class GraphingResponse(BaseModel):
    revised_query: str | None = None
    file_id: str
    graph_tye: GraphType


# graph_display: GraphGenerationDisplay | None


class GraphingError(BaseModel):
    error: str


GRAPHING_RESPONSE_ID = "graphing_response"
