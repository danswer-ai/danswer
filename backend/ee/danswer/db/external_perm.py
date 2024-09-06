from collections.abc import Sequence

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.configs.constants import DocumentSource
from danswer.db.models import ExternalUserEmail__ExternalUserGroupId


def replace_external_user__group_relations__no_commit(
    db_session: Session,
    cc_pair_id: int,
    group_defs: dict[str, list[str]],
    source: DocumentSource,
) -> None:
    """
    This function clears all existing external user group relations for a given cc_pair_id
    and replaces them with the new group definitions.
    """
    delete_statement = delete(ExternalUserEmail__ExternalUserGroupId).where(
        ExternalUserEmail__ExternalUserGroupId.cc_pair_id == cc_pair_id
    )
    db_session.execute(delete_statement)

    for external_group_id, emails in group_defs.items():
        for email in emails:
            new_external_permission = ExternalUserEmail__ExternalUserGroupId(
                user_email=email,
                external_user_group_id=external_group_id,
                cc_pair_id=cc_pair_id,
                source_type=source,
            )
            db_session.add(new_external_permission)


def fetch_ext_groups_for_user(
    db_session: Session,
    user_email: str,
) -> Sequence[ExternalUserEmail__ExternalUserGroupId]:
    return db_session.scalars(
        select(ExternalUserEmail__ExternalUserGroupId).where(
            ExternalUserEmail__ExternalUserGroupId.user_email == user_email
        )
    ).all()
