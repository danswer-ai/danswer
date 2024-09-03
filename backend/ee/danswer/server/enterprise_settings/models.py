from typing import List

from pydantic import BaseModel
from pydantic import Field


class NavigationItem(BaseModel):
    link: str
    icon: str
    title: str


class EnterpriseSettings(BaseModel):
    """General settings that only apply to the Enterprise Edition of Danswer

    NOTE: don't put anything sensitive in here, as this is accessible without auth."""

    application_name: str | None = None
    use_custom_logo: bool = False
    use_custom_logotype: bool = False

    # custom navigation
    custom_nav_items: List[NavigationItem] = []

    # custom Chat components
    two_lines_for_chat_header: bool | None = None
    custom_lower_disclaimer_content: str | None = None
    custom_header_content: str | None = None
    custom_popup_header: str | None = None
    custom_popup_content: str | None = None

    def check_validity(self) -> None:
        return


class EnterpriseSettingsModification(EnterpriseSettings):
    """
    This class extends EnterpriseSettings to allow for modifications.
    It inherits all fields from EnterpriseSettings but excludes custom_nav_items
    from being modified directly through this class.
    """

    custom_nav_items: List[NavigationItem] = Field(default=[], exclude=True)


class AnalyticsScriptUpload(BaseModel):
    script: str
    secret_key: str
