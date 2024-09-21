from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from ee.enmedd.server.teamspace.models import Teamspace
from enmedd.db.models import Workspace as WorkspaceModel


class Workspaces(BaseModel):
    """General settings that only apply to the Enterprise Edition of enMedD AI

    NOTE: don't put anything sensitive in here, as this is accessible without auth."""

    id: int = 0  # Default value of 0
    instance_id: Optional[int]
    workspace_name: str
    workspace_description: Optional[str]
    use_custom_logo: bool = False
    custom_logo: Optional[str]
    custom_header_logo: Optional[str]
    custom_header_content: Optional[str]
    groups: Optional[list[Teamspace]]

    @classmethod
    def from_model(cls, workspace_model: WorkspaceModel) -> "Workspaces":
        return cls(
            id=workspace_model.id,
            instance_id=workspace_model.instance_id,
            workspace_name=workspace_model.workspace_name,
            workspace_description=workspace_model.workspace_description,
            use_custom_logo=workspace_model.use_custom_logo,
            custom_logo=workspace_model.custom_logo,
            custom_header_logo=workspace_model.custom_header_logo,
            custom_header_content=workspace_model.custom_header_content,
            groups=[
                Teamspace.from_model(teamspace_model)
                for teamspace_model in workspace_model.groups
            ],
        )

    def check_validity(self) -> None:
        return


class WorkspaceCreate(BaseModel):
    workspace_name: str
    workspace_description: Optional[str]
    use_custom_logo: bool = False
    custom_logo: Optional[str]
    custom_header_logo: Optional[str]
    custom_header_content: Optional[str]
    user_ids: list[UUID]


class InstanceSubscriptionPlan(str, Enum):
    ENTERPRISE = "enterprise"
    PARTNER = "partner"


class Instance(BaseModel):
    instance_name: Optional[str]
    subscription_plan: InstanceSubscriptionPlan
    owner_id: UUID


class AnalyticsScriptUpload(BaseModel):
    script: str
    secret_key: str
