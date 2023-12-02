from pydantic import BaseModel
from pydantic import validator

from danswer.auth.schemas import UserRole
from danswer.configs.constants import AuthType
from danswer.danswerbot.slack.config import VALID_SLACK_FILTERS
from danswer.db.models import AllowedAnswerFilters
from danswer.db.models import ChannelConfig
from danswer.server.features.document_set.models import DocumentSet


class VersionResponse(BaseModel):
    backend_version: str


class AuthTypeResponse(BaseModel):
    auth_type: AuthType


class UserInfo(BaseModel):
    id: str
    email: str
    is_active: bool
    is_superuser: bool
    is_verified: bool
    role: UserRole


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


class SlackBotTokens(BaseModel):
    bot_token: str
    app_token: str


class SlackBotConfigCreationRequest(BaseModel):
    # currently, a persona is created for each slack bot config
    # in the future, `document_sets` will probably be replaced
    # by an optional `PersonaSnapshot` object. Keeping it like this
    # for now for simplicity / speed of development
    document_sets: list[int]
    channel_names: list[str]
    respond_tag_only: bool = False
    # If no team members, assume respond in the channel to everyone
    respond_team_member_list: list[str] = []
    answer_filters: list[AllowedAnswerFilters] = []

    @validator("answer_filters", pre=True)
    def validate_filters(cls, value: list[str]) -> list[str]:
        if any(test not in VALID_SLACK_FILTERS for test in value):
            raise ValueError(
                f"Slack Answer filters must be one of {VALID_SLACK_FILTERS}"
            )
        return value


class SlackBotConfig(BaseModel):
    id: int
    # currently, a persona is created for each slack bot config
    # in the future, `document_sets` will probably be replaced
    # by an optional `PersonaSnapshot` object. Keeping it like this
    # for now for simplicity / speed of development
    document_sets: list[DocumentSet]
    channel_config: ChannelConfig
