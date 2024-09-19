from typing import Any

from pydantic import BaseModel

from enmedd.db.models import Tool
from enmedd.server.models import MinimalTeamspaceSnapshot
from enmedd.server.models import MinimalWorkspaceSnapshot


class ToolSnapshot(BaseModel):
    id: int
    name: str
    description: str
    definition: dict[str, Any] | None
    in_code_tool_id: str | None
    groups: list[MinimalTeamspaceSnapshot] | None

    @classmethod
    def from_model(cls, tool: Tool) -> "ToolSnapshot":
        return cls(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            definition=tool.openapi_schema,
            in_code_tool_id=tool.in_code_tool_id,
            groups=[
                MinimalTeamspaceSnapshot(
                    id=teamspace.id,
                    name=teamspace.name,
                    workspace=[
                        MinimalWorkspaceSnapshot(
                            id=workspace.id, workspace_name=workspace.workspace_name
                        )
                        for workspace in teamspace.workspace
                    ],
                )
                for teamspace in tool.groups
            ],
        )
