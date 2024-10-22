from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from enmedd.configs.constants import NotificationType
from enmedd.db.models import Notification as NotificationDBModel
from enmedd.db.models import TeamspaceSettings


class PageType(str, Enum):
    CHAT = "chat"
    SEARCH = "search"


class Notification(BaseModel):
    id: int
    notif_type: NotificationType
    dismissed: bool
    last_shown: datetime
    first_shown: datetime

    @classmethod
    def from_model(cls, notif: NotificationDBModel) -> "Notification":
        return cls(
            id=notif.id,
            notif_type=notif.notif_type,
            dismissed=notif.dismissed,
            last_shown=notif.last_shown,
            first_shown=notif.first_shown,
        )


class Settings(BaseModel):
    """General settings"""

    chat_page_enabled: bool = True
    search_page_enabled: bool = True
    chat_history_enabled: Optional[bool] = None
    default_page: PageType = PageType.CHAT
    maximum_chat_retention_days: int | None = None
    gpu_enabled: bool | None = None

    def check_validity(self) -> None:
        chat_page_enabled = self.chat_page_enabled
        search_page_enabled = self.search_page_enabled
        default_page = self.default_page

        if chat_page_enabled is False and search_page_enabled is False:
            raise ValueError(
                "One of `search_page_enabled` and `chat_page_enabled` must be True."
            )

        if default_page == PageType.CHAT and chat_page_enabled is False:
            raise ValueError(
                "The default page cannot be 'chat' if the chat page is disabled."
            )

        if default_page == PageType.SEARCH and search_page_enabled is False:
            raise ValueError(
                "The default page cannot be 'search' if the search page is disabled."
            )


class UserSettings(Settings):
    notifications: list[Notification]
    needs_reindexing: bool


class TeamspaceSettings(BaseModel):
    chat_page_enabled: Optional[bool] = None
    search_page_enabled: Optional[bool] = None
    chat_history_enabled: Optional[bool] = None
    default_page: PageType = PageType.CHAT
    maximum_chat_retention_days: Optional[int] = None

    @classmethod
    def from_db(cls, settings_model: TeamspaceSettings) -> "TeamspaceSettings":
        return cls(
            chat_page_enabled=settings_model.chat_page_enabled,
            search_page_enabled=settings_model.search_page_enabled,
            chat_history_enabled=settings_model.chat_history_enabled,
            default_page=settings_model.default_page,
            maximum_chat_retention_days=settings_model.maximum_chat_retention_days,
        )
