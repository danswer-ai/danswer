from dataclasses import dataclass
from uuid import UUID

from danswer.configs.constants import PUBLIC_DOC_PAT


@dataclass(frozen=True)
class DocumentAccess:
    user_ids: set[str]  # stringified UUIDs
    is_public: bool

    def to_acl(self) -> list[str]:
        return list(self.user_ids) + ([PUBLIC_DOC_PAT] if self.is_public else [])

    @classmethod
    def build(cls, user_ids: list[UUID | None], is_public: bool) -> "DocumentAccess":
        return cls(
            user_ids={str(user_id) for user_id in user_ids if user_id},
            is_public=is_public,
        )
