from pydantic import BaseModel


class FeatureFlags(BaseModel):
    """Features Control"""

    profile_page: bool = False
    multi_teamspace: bool = False
    multi_workspace: bool = False
    query_history: bool = False

    def check_validity(self) -> None:
        return
