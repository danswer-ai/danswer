from datetime import datetime
from enum import Enum
from typing import Any
from typing import List

from pydantic import BaseModel

CUSTOM_TOOL_RESPONSE_ID = "custom_tool_response"


class CustomToolResponseType(Enum):
    IMAGE = "image"
    CSV = "csv"
    JSON = "json"
    TEXT = "text"
    SEARCH = "search"


class CustomToolFileResponse(BaseModel):
    file_ids: List[str]  # References to saved images or CSVs


class CustomToolCallSummary(BaseModel):
    tool_name: str
    response_type: CustomToolResponseType
    tool_result: Any  # The response data


class CustomToolSearchResult(BaseModel):
    document_id: str
    content: str  # content of the search result
    blurb: str  # used to display in the UI
    title: str
    link: str | None = None  # optional source link
    updated_at: datetime | None = None


class CustomToolSearchResponse(BaseModel):
    results: List[CustomToolSearchResult]
