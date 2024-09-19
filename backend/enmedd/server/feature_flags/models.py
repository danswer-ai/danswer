from pydantic import BaseModel


class FeatureFlags(BaseModel):
    """Features Control"""

    profile_page: bool = False
    multi_teamspace: bool = True
    multi_workspace: bool = False
    query_history: bool = False
    whitelabelling: bool = True
    share_chat: bool = False
    explore_assistants: bool = False

    def check_validity(self) -> None:
        return
