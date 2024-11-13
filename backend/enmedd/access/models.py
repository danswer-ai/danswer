from dataclasses import dataclass

from enmedd.access.utils import prefix_external_teamspace
from enmedd.access.utils import prefix_teamspace
from enmedd.access.utils import prefix_user_email
from enmedd.configs.constants import PUBLIC_DOC_PAT


@dataclass(frozen=True)
class ExternalAccess:
    # Emails of external users with access to the doc externally
    external_user_emails: set[str]
    # Names or external IDs of teamspaces with access to the doc
    external_teamspace_ids: set[str]
    # Whether the document is public in the external system or Arnold AI
    is_public: bool


@dataclass(frozen=True)
class DocumentAccess(ExternalAccess):
    # User emails for Arnold AI users, None indicates admin
    user_emails: set[str | None]
    # Names of user teamspaces associated with this document
    teamspaces: set[str]

    def to_acl(self) -> set[str]:
        return set(
            [
                prefix_user_email(user_email)
                for user_email in self.user_emails
                if user_email
            ]
            + [prefix_teamspace(teamspace_name) for teamspace_name in self.teamspaces]
            + [
                prefix_user_email(user_email)
                for user_email in self.external_user_emails
            ]
            + [
                # The teamspace names are already prefixed by the source type
                # This adds an additional prefix of "external_teamspace:"
                prefix_external_teamspace(teamspace_name)
                for teamspace_name in self.external_teamspace_ids
            ]
            + ([PUBLIC_DOC_PAT] if self.is_public else [])
        )

    @classmethod
    def build(
        cls,
        user_emails: list[str | None],
        teamspaces: list[str],
        external_user_emails: list[str],
        external_teamspace_ids: list[str],
        is_public: bool,
    ) -> "DocumentAccess":
        return cls(
            external_user_emails={
                prefix_user_email(external_email)
                for external_email in external_user_emails
            },
            external_teamspace_ids={
                prefix_external_teamspace(external_teamspace_id)
                for external_teamspace_id in external_teamspace_ids
            },
            user_emails={
                prefix_user_email(user_email)
                for user_email in user_emails
                if user_email
            },
            teamspaces=set(teamspaces),
            is_public=is_public,
        )
