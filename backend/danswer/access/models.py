from dataclasses import dataclass

from danswer.access.utils import prefix_external_group
from danswer.access.utils import prefix_user
from danswer.access.utils import prefix_user_group
from danswer.configs.constants import PUBLIC_DOC_PAT


@dataclass(frozen=True)
class ExternalAccess:
    external_user_emails: set[
        str
    ]  # Emails of external users with access to the doc externally
    external_user_groups: set[
        str
    ]  # Names or external IDs of groups with access to the doc
    is_public: bool


@dataclass(frozen=True)
class DocumentAccess(ExternalAccess):
    user_emails: set[str]  # User emails for Danswer users, None
    user_groups: set[str]  # Names of user groups associated with this document

    def to_acl(self) -> set[str]:
        return set(
            [prefix_user(user_email) for user_email in self.user_emails if user_email]
            + [prefix_user_group(group_name) for group_name in self.user_groups]
            + [prefix_user(user_email) for user_email in self.external_user_emails]
            + [
                # The group names are already prefixed by the source type
                # This adds an additional prefix of "external_group:"
                prefix_external_group(group_name)
                for group_name in self.external_user_groups
            ]
            + ([PUBLIC_DOC_PAT] if self.is_public else [])
        )

    @classmethod
    def build(
        cls,
        user_emails: list[str],
        user_groups: list[str],
        external_user_emails: list[str],
        external_user_groups: list[str],
        is_public: bool,
    ) -> "DocumentAccess":
        return cls(
            external_user_emails={
                prefix_user(user_email) for user_email in external_user_emails
            },
            external_user_groups={
                prefix_external_group(group_name) for group_name in external_user_groups
            },
            user_emails={prefix_user(user_email) for user_email in user_emails},
            user_groups=set(user_groups),
            is_public=is_public,
        )
