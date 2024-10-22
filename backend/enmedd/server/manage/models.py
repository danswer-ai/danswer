from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

from enmedd.auth.schemas import UserRole
from enmedd.configs.app_configs import TRACK_EXTERNAL_IDP_EXPIRY
from enmedd.configs.constants import AuthType
from enmedd.db.models import User
from enmedd.search.models import SavedSearchSettings
from enmedd.server.models import FullUserSnapshot
from enmedd.server.models import InvitedUserSnapshot
from enmedd.server.models import TeamspaceResponse
from enmedd.server.models import WorkspaceResponse


if TYPE_CHECKING:
    pass


class VersionResponse(BaseModel):
    backend_version: str


class AuthTypeResponse(BaseModel):
    auth_type: AuthType
    # specifies whether the current auth setup requires
    # users to have verified emails
    requires_verification: bool


class UserPreferences(BaseModel):
    chosen_assistants: list[int] | None = None
    hidden_assistants: list[int] = []
    visible_assistants: list[int] = []

    default_model: str | None = None


class UserInfo(BaseModel):
    id: str
    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool
    is_custom_profile: bool = False
    role: UserRole
    full_name: str | None = None
    company_name: str | None = None
    company_email: str | None = None
    company_billing: str | None = None
    billing_email_address: str | None = None
    vat: str | None = None
    preferences: UserPreferences
    workspace: list[WorkspaceResponse] | None = None
    groups: list[TeamspaceResponse] | None = None
    oidc_expiry: datetime | None = None
    current_token_created_at: datetime | None = None
    current_token_expiry_length: int | None = None

    @classmethod
    def from_model(
        cls,
        user: User,
        current_token_created_at: datetime | None = None,
        expiry_length: int | None = None,
    ) -> "UserInfo":
        return cls(
            id=str(user.id),
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            is_custom_profile=user.is_custom_profile,
            role=user.role,
            full_name=user.full_name,
            company_name=user.company_name,
            company_email=user.company_email,
            company_billing=user.company_billing,
            billing_email_address=user.billing_email_address,
            vat=user.vat,
            workspace=[
                WorkspaceResponse(
                    id=workspace.id,
                    instance_id=workspace.instance_id,
                    workspace_name=workspace.workspace_name,
                    workspace_description=workspace.workspace_description,
                    use_custom_logo=workspace.use_custom_logo,
                    custom_logo=workspace.custom_logo,
                    custom_header_content=workspace.custom_header_content,
                )
                for workspace in user.workspace
            ],
            groups=[
                TeamspaceResponse(
                    id=group.id,
                    name=group.name,
                    is_custom_logo=group.is_custom_logo,
                )
                for group in user.groups
            ],
            preferences=(
                UserPreferences(
                    chosen_assistants=user.chosen_assistants,
                    default_model=user.default_model,
                    hidden_assistants=user.hidden_assistants,
                    visible_assistants=user.visible_assistants,
                )
            ),
            # set to None if TRACK_EXTERNAL_IDP_EXPIRY is False so that we avoid cases
            # where they previously had this set + used OIDC, and now they switched to
            # basic auth are now constantly getting redirected back to the login page
            # since their "oidc_expiry is old"
            oidc_expiry=user.oidc_expiry if TRACK_EXTERNAL_IDP_EXPIRY else None,
            current_token_created_at=current_token_created_at,
            current_token_expiry_length=expiry_length,
        )


class UserByEmail(BaseModel):
    user_email: str


class UserRoleUpdateRequest(BaseModel):
    user_email: str
    new_role: UserRole


class UserRoleResponse(BaseModel):
    role: str


class BoostDoc(BaseModel):
    document_id: str
    semantic_id: str
    link: str
    boost: int
    hidden: bool


class BoostUpdateRequest(BaseModel):
    document_id: str
    boost: int


class HiddenUpdateRequest(BaseModel):
    document_id: str
    hidden: bool


class FullModelVersionResponse(BaseModel):
    current_settings: SavedSearchSettings
    secondary_settings: SavedSearchSettings | None


class AllUsersResponse(BaseModel):
    accepted: list[FullUserSnapshot]
    invited: list[InvitedUserSnapshot]
    accepted_pages: int
    invited_pages: int


class OTPVerificationRequest(BaseModel):
    otp_code: str
