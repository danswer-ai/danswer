from collections.abc import Sequence
from operator import and_
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy.orm import Session

from ee.enmedd.server.teamspace.models import TeamspaceCreate
from ee.enmedd.server.teamspace.models import TeamspaceUpdate
from ee.enmedd.server.teamspace.models import TeamspaceUserRole
from enmedd.auth.schemas import UserRole
from enmedd.db.connector_credential_pair import get_connector_credential_pair_from_id
from enmedd.db.enums import ConnectorCredentialPairStatus
from enmedd.db.models import Assistant__Teamspace
from enmedd.db.models import ConnectorCredentialPair
from enmedd.db.models import Credential__Teamspace
from enmedd.db.models import Document
from enmedd.db.models import DocumentByConnectorCredentialPair
from enmedd.db.models import DocumentSet__Teamspace
from enmedd.db.models import LLMProvider__Teamspace
from enmedd.db.models import Teamspace
from enmedd.db.models import Teamspace__ConnectorCredentialPair
from enmedd.db.models import TokenRateLimit__Teamspace
from enmedd.db.models import User
from enmedd.db.models import User__Teamspace
from enmedd.db.models import Workspace__Teamspace
from enmedd.utils.logger import setup_logger

logger = setup_logger()

# TODO: organize; segregate all the utils / helper functions from the main db-interacting


def validate_user_creation_permissions(
    db_session: Session,
    user: User | None,
    target_group_ids: list[int] | None,
) -> None:
    """
    All admin actions are allowed.
    Prevents non-admins from creating/editing:
    - public objects
    - objects with no groups
    - objects that belong to a group they don't curate
    """
    if not user or user.role == UserRole.ADMIN:
        return

    if not target_group_ids:
        detail = "Curators must specify 1+ groups"
        logger.error(detail)
        raise HTTPException(
            status_code=400,
            detail=detail,
        )
    user_groups = fetch_teamspaces_for_user(db_session=db_session, user_id=user.id)
    user_group_ids = set([group.id for group in user_groups])
    target_group_ids_set = set(target_group_ids)
    if not target_group_ids_set.issubset(user_group_ids):
        detail = "Curators cannot control groups they don't curate"
        logger.error(detail)
        raise HTTPException(
            status_code=400,
            detail=detail,
        )


def fetch_teamspace(db_session: Session, teamspace_id: int) -> Teamspace | None:
    stmt = select(Teamspace).where(Teamspace.id == teamspace_id)
    return db_session.scalar(stmt)


def fetch_teamspaces(
    db_session: Session, only_up_to_date: bool = True
) -> Sequence[Teamspace]:
    """
    Fetches teamspaces from the database.

    This function retrieves a sequence of `Teamspace` objects from the database.
    If `only_up_to_date` is set to `True`, it filters the teamspaces to return only those
    that are marked as up-to-date (`is_up_to_date` is `True`).

    Args:
        db_session (Session): The SQLAlchemy session used to query the database.
        only_up_to_date (bool, optional): Flag to determine whether to filter the results
            to include only up to date teamspaces. Defaults to `True`.

    Returns:
        Sequence[Teamspace]: A sequence of `Teamspace` objects matching the query criteria.
    """
    stmt = select(Teamspace)
    if only_up_to_date:
        stmt = stmt.where(Teamspace.is_up_to_date == True)  # noqa: E712
    return db_session.scalars(stmt).all()


def fetch_teamspaces_for_user(
    db_session: Session, user_id: UUID
) -> Sequence[Teamspace]:
    stmt = (
        select(Teamspace)
        .join(User__Teamspace, User__Teamspace.teamspace_id == Teamspace.id)
        .join(User, User.id == User__Teamspace.user_id)  # type: ignore
        .where(User.id == user_id)  # type: ignore
    )
    return db_session.scalars(stmt).all()


def construct_document_select_by_teamspace(
    teamspace_id: int,
) -> Select:
    """This returns a statement that should be executed using
    .yield_per() to minimize overhead. The primary consumers of this function
    are background processing task generators."""
    stmt = (
        select(Document)
        .join(
            DocumentByConnectorCredentialPair,
            Document.id == DocumentByConnectorCredentialPair.id,
        )
        .join(
            ConnectorCredentialPair,
            and_(
                DocumentByConnectorCredentialPair.connector_id
                == ConnectorCredentialPair.connector_id,
                DocumentByConnectorCredentialPair.credential_id
                == ConnectorCredentialPair.credential_id,
            ),
        )
        .join(
            Teamspace__ConnectorCredentialPair,
            Teamspace__ConnectorCredentialPair.cc_pair_id == ConnectorCredentialPair.id,
        )
        .join(
            Teamspace,
            Teamspace__ConnectorCredentialPair.teamspace_id == Teamspace.id,
        )
        .where(Teamspace.id == teamspace_id)
        .order_by(Document.id)
    )
    stmt = stmt.distinct()
    return stmt


def fetch_documents_for_teamspace_paginated(
    db_session: Session,
    teamspace_id: int,
    last_document_id: str | None = None,
    limit: int = 100,
) -> tuple[Sequence[Document], str | None]:
    stmt = (
        select(Document)
        .join(
            DocumentByConnectorCredentialPair,
            Document.id == DocumentByConnectorCredentialPair.id,
        )
        .join(
            ConnectorCredentialPair,
            and_(
                DocumentByConnectorCredentialPair.connector_id
                == ConnectorCredentialPair.connector_id,
                DocumentByConnectorCredentialPair.credential_id
                == ConnectorCredentialPair.credential_id,
            ),
        )
        .join(
            Teamspace__ConnectorCredentialPair,
            Teamspace__ConnectorCredentialPair.cc_pair_id == ConnectorCredentialPair.id,
        )
        .join(
            Teamspace,
            Teamspace__ConnectorCredentialPair.teamspace_id == Teamspace.id,
        )
        .where(Teamspace.id == teamspace_id)
        .order_by(Document.id)
        .limit(limit)
    )
    if last_document_id is not None:
        stmt = stmt.where(Document.id > last_document_id)
    stmt = stmt.distinct()

    documents = db_session.scalars(stmt).all()
    return documents, documents[-1].id if documents else None


def fetch_teamspaces_for_documents(
    db_session: Session,
    document_ids: list[str],
) -> Sequence[tuple[str, list[str]]]:
    stmt = (
        select(Document.id, func.array_agg(Teamspace.name))
        .join(
            Teamspace__ConnectorCredentialPair,
            Teamspace.id == Teamspace__ConnectorCredentialPair.teamspace_id,
        )
        .join(
            ConnectorCredentialPair,
            ConnectorCredentialPair.id == Teamspace__ConnectorCredentialPair.cc_pair_id,
        )
        .join(
            DocumentByConnectorCredentialPair,
            and_(
                DocumentByConnectorCredentialPair.connector_id
                == ConnectorCredentialPair.connector_id,
                DocumentByConnectorCredentialPair.credential_id
                == ConnectorCredentialPair.credential_id,
            ),
        )
        .join(Document, Document.id == DocumentByConnectorCredentialPair.id)
        .where(Document.id.in_(document_ids))
        .where(Teamspace__ConnectorCredentialPair.is_current == True)  # noqa: E712
        # don't include CC pairs that are being deleted
        # NOTE: CC pairs can never go from DELETING to any other state -> it's safe to ignore them
        .where(ConnectorCredentialPair.status != ConnectorCredentialPairStatus.DELETING)
        .group_by(Document.id)
    )

    return db_session.execute(stmt).all()  # type: ignore


def _check_teamspace_is_modifiable(teamspace: Teamspace) -> None:
    if not teamspace.is_up_to_date:
        raise ValueError(
            "Specified teamspace is currently syncing. Wait until the current "
            "sync has finished before editing."
        )


def _add_user__teamspace_relationships__no_commit(
    db_session: Session,
    teamspace_id: int,
    user_ids: list[UUID],
    creator_id: Optional[UUID] = None,
) -> list[User__Teamspace]:
    """NOTE: does not commit the transaction."""

    # if creator_id not in user_ids:
    #     user_ids.append(creator_id)

    relationships = [
        User__Teamspace(
            user_id=user_id,
            teamspace_id=teamspace_id,
            # TODO: replace this with the CREATOR role but with the same
            # privilege as the ADMIN.
            role=TeamspaceUserRole.ADMIN
            if user_id == creator_id
            else TeamspaceUserRole.BASIC,
        )
        for user_id in user_ids
    ]
    db_session.add_all(relationships)
    return relationships


def _add_teamspace__cc_pair_relationships__no_commit(
    db_session: Session, teamspace_id: int, cc_pair_ids: list[int]
) -> list[Teamspace__ConnectorCredentialPair]:
    """NOTE: does not commit the transaction."""
    relationships = [
        Teamspace__ConnectorCredentialPair(
            teamspace_id=teamspace_id, cc_pair_id=cc_pair_id
        )
        for cc_pair_id in cc_pair_ids
    ]
    db_session.add_all(relationships)
    return relationships


def _cleanup_user__teamspace_relationships__no_commit(
    db_session: Session,
    teamspace_id: int,
    user_ids: list[UUID] | None = None,
) -> None:
    """NOTE: does not commit the transaction."""
    where_clause = User__Teamspace.teamspace_id == teamspace_id
    if user_ids:
        where_clause &= User__Teamspace.user_id.in_(user_ids)

    user__teamspace_relationships = db_session.scalars(
        select(User__Teamspace).where(where_clause)
    ).all()
    for user__teamspace_relationship in user__teamspace_relationships:
        db_session.delete(user__teamspace_relationship)


def _cleanup_credential__teamspace_relationships__no_commit(
    db_session: Session,
    teamspace_id: int,
) -> None:
    """NOTE: does not commit the transaction."""
    db_session.query(Credential__Teamspace).filter(
        Credential__Teamspace.teamspace_id == teamspace_id
    ).delete(synchronize_session=False)


def _cleanup_llm_provider__teamspace_relationships__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    db_session.query(LLMProvider__Teamspace).filter(
        LLMProvider__Teamspace.teamspace_id == teamspace_id
    ).delete(synchronize_session=False)


def _mark_teamspace__cc_pair_relationships_outdated__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    teamspace__cc_pair_relationships = db_session.scalars(
        select(Teamspace__ConnectorCredentialPair).where(
            Teamspace__ConnectorCredentialPair.teamspace_id == teamspace_id
        )
    )
    for teamspace__cc_pair_relationship in teamspace__cc_pair_relationships:
        teamspace__cc_pair_relationship.is_current = False


def _cleanup_teamspace__cc_pair_relationships__no_commit(
    db_session: Session, teamspace_id: int, outdated_only: bool
) -> None:
    """NOTE: does not commit the transaction."""
    stmt = select(Teamspace__ConnectorCredentialPair).where(
        Teamspace__ConnectorCredentialPair.teamspace_id == teamspace_id
    )
    if outdated_only:
        stmt = stmt.where(
            Teamspace__ConnectorCredentialPair.is_current == False  # noqa: E712
        )
    teamspace__cc_pair_relationships = db_session.scalars(stmt)
    for teamspace__cc_pair_relationship in teamspace__cc_pair_relationships:
        db_session.delete(teamspace__cc_pair_relationship)


def _add_teamspace__document_set_relationships__no_commit(
    db_session: Session, teamspace_id: int, document_set_ids: list[int]
) -> list[DocumentSet__Teamspace]:
    """NOTE: does not commit the transaction."""
    relationships = [
        DocumentSet__Teamspace(
            teamspace_id=teamspace_id, document_set_id=document_set_id
        )
        for document_set_id in document_set_ids
    ]
    db_session.add_all(relationships)
    return relationships


def _add_teamspace__assistant_relationships__no_commit(
    db_session: Session, teamspace_id: int, assistant_ids: list[int]
) -> list[Assistant__Teamspace]:
    """NOTE: does not commit the transaction."""
    relationships = [
        Assistant__Teamspace(teamspace_id=teamspace_id, assistant_id=assistant_id)
        for assistant_id in assistant_ids
    ]
    db_session.add_all(relationships)
    return relationships


def _add_workspace__teamspace_relationship(
    db_session: Session, workspace_id: int, teamspace_id: int
) -> Workspace__Teamspace:
    relationship = Workspace__Teamspace(
        workspace_id=workspace_id,
        teamspace_id=teamspace_id,
    )
    db_session.add(relationship)
    return relationship


def insert_teamspace(
    db_session: Session, teamspace: TeamspaceCreate, creator_id: UUID
) -> Teamspace:
    db_teamspace = Teamspace(name=teamspace.name, creator_id=creator_id)
    db_session.add(db_teamspace)
    db_session.flush()  # give the group an ID

    _add_user__teamspace_relationships__no_commit(
        db_session=db_session,
        teamspace_id=db_teamspace.id,
        user_ids=teamspace.user_ids,
        creator_id=creator_id,
    )
    _add_teamspace__document_set_relationships__no_commit(
        db_session=db_session,
        teamspace_id=db_teamspace.id,
        document_set_ids=teamspace.document_set_ids,
    )
    _add_teamspace__assistant_relationships__no_commit(
        db_session=db_session,
        teamspace_id=db_teamspace.id,
        assistant_ids=teamspace.assistant_ids,
    )
    _add_teamspace__cc_pair_relationships__no_commit(
        db_session=db_session,
        teamspace_id=db_teamspace.id,
        cc_pair_ids=teamspace.cc_pair_ids,
    )
    _add_workspace__teamspace_relationship(
        db_session, teamspace.workspace_id, db_teamspace.id
    )

    db_session.commit()
    return db_teamspace


def _mark_teamspace__document_set_relationships_outdated__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    teamspace__document_set_relationships = db_session.scalars(
        select(DocumentSet__Teamspace).where(
            DocumentSet__Teamspace.teamspace_id == teamspace_id
        )
    )
    for teamspace__document_set_relationship in teamspace__document_set_relationships:
        teamspace__document_set_relationship.is_current = False


def _mark_teamspace__assistant_relationships_outdated__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    teamspace__assistant_relationships = db_session.scalars(
        select(Assistant__Teamspace).where(
            Assistant__Teamspace.teamspace_id == teamspace_id
        )
    )
    for teamspace__assistant_relationship in teamspace__assistant_relationships:
        teamspace__assistant_relationship.is_current = False


def _sync_relationships(
    db_session: Session,
    teamspace_id: int,
    updated_user_ids: list[UUID],
    updated_cc_pair_ids: list[int],
    updated_document_set_ids: list[int],
    updated_assistant_ids: list[int],
) -> None:
    current_user_ids = set(
        db_session.scalars(
            select(User__Teamspace.user_id).where(
                User__Teamspace.teamspace_id == teamspace_id
            )
        ).all()
    )
    current_cc_pair_ids = set(
        db_session.scalars(
            select(Teamspace__ConnectorCredentialPair.cc_pair_id).where(
                Teamspace__ConnectorCredentialPair.teamspace_id == teamspace_id
            )
        ).all()
    )
    current_document_set_ids = set(
        db_session.scalars(
            select(DocumentSet__Teamspace.document_set_id).where(
                DocumentSet__Teamspace.teamspace_id == teamspace_id
            )
        ).all()
    )
    current_assistant_ids = set(
        db_session.scalars(
            select(Assistant__Teamspace.assistant_id).where(
                Assistant__Teamspace.teamspace_id == teamspace_id
            )
        ).all()
    )

    users_to_delete = current_user_ids - set(updated_user_ids)
    users_to_add = set(updated_user_ids) - current_user_ids

    cc_pairs_to_delete = current_cc_pair_ids - set(updated_cc_pair_ids)
    cc_pairs_to_add = set(updated_cc_pair_ids) - current_cc_pair_ids

    document_sets_to_delete = current_document_set_ids - set(updated_document_set_ids)
    document_sets_to_add = set(updated_document_set_ids) - current_document_set_ids

    assistants_to_delete = current_assistant_ids - set(updated_assistant_ids)
    assistants_to_add = set(updated_assistant_ids) - current_assistant_ids

    if users_to_delete:
        db_session.execute(
            delete(User__Teamspace)
            .where(User__Teamspace.teamspace_id == teamspace_id)
            .where(User__Teamspace.user_id.in_(users_to_delete))
        )

    if cc_pairs_to_delete:
        db_session.execute(
            delete(Teamspace__ConnectorCredentialPair)
            .where(Teamspace__ConnectorCredentialPair.teamspace_id == teamspace_id)
            .where(
                Teamspace__ConnectorCredentialPair.cc_pair_id.in_(cc_pairs_to_delete)
            )
        )

    if document_sets_to_delete:
        db_session.execute(
            delete(DocumentSet__Teamspace)
            .where(DocumentSet__Teamspace.teamspace_id == teamspace_id)
            .where(DocumentSet__Teamspace.document_set_id.in_(document_sets_to_delete))
        )

    if assistants_to_delete:
        db_session.execute(
            delete(Assistant__Teamspace)
            .where(Assistant__Teamspace.teamspace_id == teamspace_id)
            .where(Assistant__Teamspace.assistant_id.in_(assistants_to_delete))
        )

    if users_to_add:
        _add_user__teamspace_relationships__no_commit(
            db_session=db_session,
            teamspace_id=teamspace_id,
            user_ids=list(users_to_add),
        )

    if cc_pairs_to_add:
        _add_teamspace__cc_pair_relationships__no_commit(
            db_session=db_session,
            teamspace_id=teamspace_id,
            cc_pair_ids=list(cc_pairs_to_add),
        )

    if document_sets_to_add:
        _add_teamspace__document_set_relationships__no_commit(
            db_session=db_session,
            teamspace_id=teamspace_id,
            document_set_ids=list(document_sets_to_add),
        )

    if assistants_to_add:
        _add_teamspace__assistant_relationships__no_commit(
            db_session=db_session,
            teamspace_id=teamspace_id,
            assistant_ids=list(assistants_to_add),
        )

    db_session.commit()


def update_teamspace(
    db_session: Session, teamspace_id: int, teamspace: TeamspaceUpdate
) -> Teamspace:
    """If successful, this can set db_teamspace.is_up_to_date = False.
    That will be processed by check_for_vespa_teamspace_sync_task and trigger
    a long running background sync to Vespa.
    """
    stmt = select(Teamspace).where(Teamspace.id == teamspace_id)
    db_teamspace = db_session.scalar(stmt)
    if db_teamspace is None:
        raise ValueError(f"Teamspace with id '{teamspace_id}' not found")

    _check_teamspace_is_modifiable(db_teamspace)

    _sync_relationships(
        db_session=db_session,
        teamspace_id=teamspace_id,
        updated_user_ids=teamspace.user_ids,
        updated_cc_pair_ids=teamspace.cc_pair_ids,
        updated_document_set_ids=teamspace.document_set_ids,
        updated_assistant_ids=teamspace.assistant_ids,
    )

    if set([cc_pair.id for cc_pair in db_teamspace.cc_pairs]) != set(
        teamspace.cc_pair_ids
    ):
        db_teamspace.is_up_to_date = False

    db_session.commit()
    return db_teamspace


def _cleanup_token_rate_limit__teamspace_relationships__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    token_rate_limit__teamspace_relationships = db_session.scalars(
        select(TokenRateLimit__Teamspace).where(
            TokenRateLimit__Teamspace.teamspace_id == teamspace_id
        )
    ).all()
    for (
        token_rate_limit__teamspace_relationship
    ) in token_rate_limit__teamspace_relationships:
        db_session.delete(token_rate_limit__teamspace_relationship)


def prepare_teamspace_for_deletion(db_session: Session, teamspace_id: int) -> None:
    stmt = select(Teamspace).where(Teamspace.id == teamspace_id)
    db_teamspace = db_session.scalar(stmt)
    if db_teamspace is None:
        raise ValueError(f"Teamspace with id '{teamspace_id}' not found")

    _check_teamspace_is_modifiable(db_teamspace)

    _cleanup_credential__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )
    _cleanup_user__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )
    _mark_teamspace__cc_pair_relationships_outdated__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )
    _mark_teamspace__document_set_relationships_outdated__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )
    _mark_teamspace__assistant_relationships_outdated__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )
    _cleanup_token_rate_limit__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace_id
    )

    db_teamspace.is_up_to_date = False
    db_teamspace.is_up_for_deletion = True
    db_session.commit()


def _cleanup_teamspace__cc_pair_relationships__no_commit(
    db_session: Session, teamspace_id: int, outdated_only: bool
) -> None:
    """NOTE: does not commit the transaction."""
    stmt = select(Teamspace__ConnectorCredentialPair).where(
        Teamspace__ConnectorCredentialPair.teamspace_id == teamspace_id
    )
    if outdated_only:
        stmt = stmt.where(
            Teamspace__ConnectorCredentialPair.is_current == False  # noqa: E712
        )
    teamspace__cc_pair_relationships = db_session.scalars(stmt)
    for teamspace__cc_pair_relationship in teamspace__cc_pair_relationships:
        db_session.delete(teamspace__cc_pair_relationship)


def _cleanup_document_set__teamspace_relationships__no_commit(
    db_session: Session, teamspace_id: int
) -> None:
    """NOTE: does not commit the transaction."""
    db_session.execute(
        delete(DocumentSet__Teamspace).where(
            DocumentSet__Teamspace.teamspace_id == teamspace_id
        )
    )


def mark_teamspace_as_synced(db_session: Session, teamspace: Teamspace) -> None:
    # cleanup outdated relationships
    _cleanup_teamspace__cc_pair_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace.id, outdated_only=True
    )
    teamspace.is_up_to_date = True
    db_session.commit()


def delete_teamspace(db_session: Session, teamspace: Teamspace) -> None:
    # TODO: add cleaning up of chat sessions, folders, and assistants. if not, just add cascade delete

    _cleanup_llm_provider__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace.id
    )
    _cleanup_user__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace.id
    )
    _cleanup_teamspace__cc_pair_relationships__no_commit(
        db_session=db_session,
        teamspace_id=teamspace.id,
        outdated_only=False,
    )
    _cleanup_document_set__teamspace_relationships__no_commit(
        db_session=db_session, teamspace_id=teamspace.id
    )

    # need to flush so that we don't get a foreign key error when deleting the teamspace row
    db_session.flush()

    db_session.delete(teamspace)
    db_session.commit()


def delete_teamspace_cc_pair_relationship__no_commit(
    cc_pair_id: int, db_session: Session
) -> None:
    """Deletes all rows from Teamspace__ConnectorCredentialPair where the
    connector_credential_pair_id matches the given cc_pair_id.

    Should be used very carefully (only for connectors that are being deleted)."""
    cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
    if not cc_pair:
        raise ValueError(f"Connector Credential Pair '{cc_pair_id}' does not exist")

    if cc_pair.status != ConnectorCredentialPairStatus.DELETING:
        raise ValueError(
            f"Connector Credential Pair '{cc_pair_id}' is not in the DELETING state"
        )

    delete_stmt = delete(Teamspace__ConnectorCredentialPair).where(
        Teamspace__ConnectorCredentialPair.cc_pair_id == cc_pair_id,
    )
    db_session.execute(delete_stmt)
