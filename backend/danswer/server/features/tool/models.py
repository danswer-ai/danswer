from typing import Any

from pydantic import BaseModel

from danswer.db.models import Tool


class ToolSnapshot(BaseModel):
    id: int
    name: str
    description: str
    definition: dict[str, Any] | None
    display_name: str
    in_code_tool_id: str | None
    custom_headers: list[Any] | None

    @classmethod
    def from_model(cls, tool: Tool) -> "ToolSnapshot":
        return cls(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            definition=tool.openapi_schema,
            display_name=tool.display_name or tool.name,
            in_code_tool_id=tool.in_code_tool_id,
            custom_headers=tool.custom_headers,
        )


class ToolSnapshotWithUsability(ToolSnapshot):
    usable: bool
    unusable_reason: str | None

    @classmethod
    def from_model(
        cls, tool: Tool, usable: bool, unusable_reason: str | None
    ) -> "ToolSnapshotWithUsability":
        tool_snapshot = ToolSnapshot.from_model(tool)
        return cls(
            id=tool_snapshot.id,
            name=tool_snapshot.name,
            description=tool_snapshot.description,
            definition=tool_snapshot.definition,
            display_name=tool_snapshot.display_name,
            in_code_tool_id=tool_snapshot.in_code_tool_id,
            custom_headers=tool_snapshot.custom_headers,
            usable=usable,
            unusable_reason=unusable_reason,
        )


class Header(BaseModel):
    key: str
    value: str


class CustomToolCreate(BaseModel):
    name: str
    description: str | None = None
    definition: dict[str, Any]
    custom_headers: list[Header] | None = None


class CustomToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    definition: dict[str, Any] | None = None
    custom_headers: list[Header] | None = None
