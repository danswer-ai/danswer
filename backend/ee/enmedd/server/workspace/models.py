from enum import Enum
from typing import Any
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from ee.enmedd.server.teamspace.models import Teamspace
from enmedd.db.models import Workspace as WorkspaceModel


class Workspaces(BaseModel):
    """General settings that only apply to the Enterprise Edition of Arnold AI

    NOTE: don't put anything sensitive in here, as this is accessible without auth."""

    id: int = 0  # Default value of 0
    instance_id: Optional[int] = None
    workspace_name: str
    workspace_description: Optional[str] = None
    use_custom_logo: bool = False
    custom_logo: Optional[str] = None
    custom_header_logo: Optional[str] = None
    custom_header_content: Optional[str] = None
    brand_color: Optional[str] = None
    secondary_color: Optional[str] = None
    groups: Optional[list[Teamspace]] = None

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
            brand_color=workspace_model.brand_color,
            secondary_color=workspace_model.secondary_color,
            groups=[
                Teamspace.from_model(teamspace_model)
                for teamspace_model in workspace_model.groups
            ],
        )

    def check_validity(self) -> None:
        return


class NavigationItem(BaseModel):
    link: str
    title: str
    # Right now must be one of the FA icons
    icon: str | None = None
    # NOTE: SVG must not have a width / height specified
    # This is the actual SVG as a string. Done this way to reduce
    # complexity / having to store additional "logos" in Postgres
    svg_logo: str | None = None

    @classmethod
    def model_validate(cls, *args: Any, **kwargs: Any) -> "NavigationItem":
        instance = super().model_validate(*args, **kwargs)
        if bool(instance.icon) == bool(instance.svg_logo):
            raise ValueError("Exactly one of fa_icon or svg_logo must be specified")
        return instance


class WorkspaceCreate(BaseModel):
    workspace_name: str
    workspace_description: Optional[str] = None
    use_custom_logo: bool = False
    custom_logo: Optional[str] = None
    custom_header_logo: Optional[str] = None
    custom_header_content: Optional[str] = None
    brand_color: Optional[str] = None
    secondary_color: Optional[str] = None
    user_ids: list[UUID]


class WorkspaceUpdate(BaseModel):
    workspace_name: Optional[str] = None
    workspace_description: Optional[str] = None
    use_custom_logo: bool = False
    custom_logo: Optional[str] = None
    custom_header_logo: Optional[str] = None
    custom_header_content: Optional[str] = None
    brand_color: Optional[str] = None
    secondary_color: Optional[str] = None
    user_ids: Optional[list[UUID]] = None


class InstanceSubscriptionPlan(str, Enum):
    ENTERPRISE = "enterprise"
    PARTNER = "partner"


class Instance(BaseModel):
    instance_name: Optional[str] = None
    subscription_plan: InstanceSubscriptionPlan
    owner_id: UUID


class AnalyticsScriptUpload(BaseModel):
    script: str
    secret_key: str
