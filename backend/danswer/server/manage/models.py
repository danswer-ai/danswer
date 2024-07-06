from typing import Any
from typing import TYPE_CHECKING

from pydantic import BaseModel
from pydantic import root_validator
from pydantic import validator

from danswer.auth.schemas import UserRole
from danswer.configs.constants import AuthType
from danswer.danswerbot.slack.config import VALID_SLACK_FILTERS
from danswer.db.models import AllowedAnswerFilters
from danswer.db.models import ChannelConfig
from danswer.db.models import SlackApp as SlackAppModel
from danswer.db.models import SlackBotConfig as SlackBotConfigModel
from danswer.db.models import SlackBotResponseType
from danswer.indexing.models import EmbeddingModelDetail
from danswer.server.features.persona.models import PersonaSnapshot
from danswer.server.models import FullUserSnapshot
from danswer.server.models import InvitedUserSnapshot

if TYPE_CHECKING:
    from danswer.db.models import User as UserModel


class VersionResponse(BaseModel):
    backend_version: str


class AuthTypeResponse(BaseModel):
    auth_type: AuthType
    # specifies whether the current auth setup requires
    # users to have verified emails
    requires_verification: bool


class UserPreferences(BaseModel):
    chosen_assistants: list[int] | None


class UserInfo(BaseModel):
    id: str
    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool
    role: UserRole
    preferences: UserPreferences

    @classmethod
    def from_model(cls, user: "UserModel") -> "UserInfo":
        return cls(
            id=str(user.id),
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            role=user.role,
            preferences=(UserPreferences(chosen_assistants=user.chosen_assistants)),
        )


class UserByEmail(BaseModel):
    user_email: str


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


class SlackAppCreationRequest(BaseModel):
    name: str
    description: str
    enabled: bool

    bot_token: str
    app_token: str


class SlackBotTokens(BaseModel):
    bot_token: str
    app_token: str

    class Config:
        frozen = True


class SlackBotConfigCreationRequest(BaseModel):
    app_id: int
    # currently, a persona is created for each slack bot config
    # in the future, `document_sets` will probably be replaced
    # by an optional `PersonaSnapshot` object. Keeping it like this
    # for now for simplicity / speed of development
    document_sets: list[int] | None
    persona_id: (
        int | None
    )  # NOTE: only one of `document_sets` / `persona_id` should be set
    channel_names: list[str]
    respond_tag_only: bool = False
    respond_to_bots: bool = False
    # If no team members, assume respond in the channel to everyone
    respond_team_member_list: list[str] = []
    respond_slack_group_list: list[str] = []
    answer_filters: list[AllowedAnswerFilters] = []
    # list of user emails
    follow_up_tags: list[str] | None = None
    response_type: SlackBotResponseType

    @validator("answer_filters", pre=True)
    def validate_filters(cls, value: list[str]) -> list[str]:
        if any(test not in VALID_SLACK_FILTERS for test in value):
            raise ValueError(
                f"Slack Answer filters must be one of {VALID_SLACK_FILTERS}"
            )
        return value

    @root_validator
    def validate_document_sets_and_persona_id(
        cls, values: dict[str, Any]
    ) -> dict[str, Any]:
        if values.get("document_sets") and values.get("persona_id"):
            raise ValueError("Only one of `document_sets` / `persona_id` should be set")

        return values


class SlackBotConfig(BaseModel):
    id: int
    app_id: int
    persona: PersonaSnapshot | None
    channel_config: ChannelConfig
    response_type: SlackBotResponseType

    @classmethod
    def from_model(
        cls, slack_bot_config_model: SlackBotConfigModel
    ) -> "SlackBotConfig":
        return cls(
            id=slack_bot_config_model.id,
            app_id=slack_bot_config_model.app_id,
            persona=(
                PersonaSnapshot.from_model(
                    slack_bot_config_model.persona, allow_deleted=True
                )
                if slack_bot_config_model.persona
                else None
            ),
            channel_config=slack_bot_config_model.channel_config,
            response_type=slack_bot_config_model.response_type,
        )


class SlackApp(BaseModel):
    id: int
    name: str
    description: str
    enabled: bool

    bot_token: str
    app_token: str

    @classmethod
    def from_model(cls, slack_app_model: SlackAppModel) -> "SlackApp":
        return cls(
            id=slack_app_model.id,
            name=slack_app_model.name,
            description=slack_app_model.description,
            enabled=slack_app_model.enabled,
            bot_token=slack_app_model.bot_token,
            app_token=slack_app_model.app_token,
        )


class FullModelVersionResponse(BaseModel):
    current_model: EmbeddingModelDetail
    secondary_model: EmbeddingModelDetail | None


class AllUsersResponse(BaseModel):
    accepted: list[FullUserSnapshot]
    invited: list[InvitedUserSnapshot]
    accepted_pages: int
    invited_pages: int
