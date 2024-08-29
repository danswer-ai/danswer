from dataclasses import dataclass
from uuid import UUID

from enmedd.access.utils import prefix_user
from enmedd.access.utils import prefix_teamspace
from enmedd.configs.constants import PUBLIC_DOC_PAT


@dataclass(frozen=True)
class DocumentAccess:
    user_ids: set[str]  # stringified UUIDs
    teamspaces: set[str]  # names of teamspaces associated with this document
    is_public: bool

    def to_acl(self) -> list[str]:
        return (
            [prefix_user(user_id) for user_id in self.user_ids]
            + [prefix_teamspace(group_name) for group_name in self.teamspaces]
            + ([PUBLIC_DOC_PAT] if self.is_public else [])
        )

    @classmethod
    def build(
        cls, user_ids: list[UUID | None], teamspaces: list[str], is_public: bool
    ) -> "DocumentAccess":
        return cls(
            user_ids={str(user_id) for user_id in user_ids if user_id},
            teamspaces=set(teamspaces),
            is_public=is_public,
        )
