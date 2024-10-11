from collections.abc import Sequence
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from enmedd.access.utils import prefix_teamspace_w_source
from enmedd.configs.constants import DocumentSource
from enmedd.db.models import User__ExternalTeamspaceId


class ExternalTeamspace(BaseModel):
    id: str
    user_ids: list[UUID]


def delete_user__ext_teamspace_for_user__no_commit(
    db_session: Session,
    user_id: UUID,
) -> None:
    db_session.execute(
        delete(User__ExternalTeamspaceId).where(
            User__ExternalTeamspaceId.user_id == user_id
        )
    )


def delete_user__ext_teamspace_for_cc_pair__no_commit(
    db_session: Session,
    cc_pair_id: int,
) -> None:
    db_session.execute(
        delete(User__ExternalTeamspaceId).where(
            User__ExternalTeamspaceId.cc_pair_id == cc_pair_id
        )
    )


def replace_user__ext_teamspace_for_cc_pair__no_commit(
    db_session: Session,
    cc_pair_id: int,
    teamspace_defs: list[ExternalTeamspace],
    source: DocumentSource,
) -> None:
    """
    This function clears all existing external user teamspace relations for a given cc_pair_id
    and replaces them with the new teamspace definitions.
    """
    delete_user__ext_teamspace_for_cc_pair__no_commit(
        db_session=db_session,
        cc_pair_id=cc_pair_id,
    )

    new_external_permissions = [
        User__ExternalTeamspaceId(
            user_id=user_id,
            external_user_teamspace_id=prefix_teamspace_w_source(
                external_teamspace.id, source
            ),
            cc_pair_id=cc_pair_id,
        )
        for external_teamspace in teamspace_defs
        for user_id in external_teamspace.user_ids
    ]

    db_session.add_all(new_external_permissions)


def fetch_external_teamspaces_for_user(
    db_session: Session,
    user_id: UUID,
) -> Sequence[User__ExternalTeamspaceId]:
    return db_session.scalars(
        select(User__ExternalTeamspaceId).where(
            User__ExternalTeamspaceId.user_id == user_id
        )
    ).all()
