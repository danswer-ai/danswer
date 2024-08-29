from uuid import UUID

from sqlalchemy.orm import Session

from enmedd.db.models import ConnectorCredentialPair
from enmedd.db.models import DocumentSet
from enmedd.db.models import DocumentSet__ConnectorCredentialPair
from enmedd.db.models import DocumentSet__User
from enmedd.db.models import DocumentSet__Teamspace
from enmedd.db.models import User__Teamspace
from enmedd.db.models import Teamspace


def make_doc_set_private(
    document_set_id: int,
    user_ids: list[UUID] | None,
    team_ids: list[int] | None,
    db_session: Session,
) -> None:
    db_session.query(DocumentSet__User).filter(
        DocumentSet__User.document_set_id == document_set_id
    ).delete(synchronize_session="fetch")
    db_session.query(DocumentSet__Teamspace).filter(
        DocumentSet__Teamspace.document_set_id == document_set_id
    ).delete(synchronize_session="fetch")

    if user_ids:
        for user_uuid in user_ids:
            db_session.add(
                DocumentSet__User(document_set_id=document_set_id, user_id=user_uuid)
            )

    if team_ids:
        for team_id in team_ids:
            db_session.add(
                DocumentSet__Teamspace(
                    document_set_id=document_set_id, teamspace_id=team_id
                )
            )


def delete_document_set_privacy__no_commit(
    document_set_id: int, db_session: Session
) -> None:
    db_session.query(DocumentSet__User).filter(
        DocumentSet__User.document_set_id == document_set_id
    ).delete(synchronize_session="fetch")

    db_session.query(DocumentSet__Teamspace).filter(
        DocumentSet__Teamspace.document_set_id == document_set_id
    ).delete(synchronize_session="fetch")


def fetch_document_sets(
    user_id: UUID | None,
    db_session: Session,
    include_outdated: bool = True,  # Parameter only for versioned implementation, unused
) -> list[tuple[DocumentSet, list[ConnectorCredentialPair]]]:
    assert user_id is not None

    # Public document sets
    public_document_sets = (
        db_session.query(DocumentSet)
        .filter(DocumentSet.is_public == True)  # noqa
        .all()
    )

    # Document sets via shared user relationships
    shared_document_sets = (
        db_session.query(DocumentSet)
        .join(DocumentSet__User, DocumentSet.id == DocumentSet__User.document_set_id)
        .filter(DocumentSet__User.user_id == user_id)
        .all()
    )

    # Document sets via groups
    # First, find the teamspaces the user belongs to
    teamspaces = (
        db_session.query(Teamspace)
        .join(User__Teamspace, Teamspace.id == User__Teamspace.teamspace_id)
        .filter(User__Teamspace.user_id == user_id)
        .all()
    )

    group_document_sets = []
    for group in teamspaces:
        group_document_sets.extend(
            db_session.query(DocumentSet)
            .join(
                DocumentSet__Teamspace,
                DocumentSet.id == DocumentSet__Teamspace.document_set_id,
            )
            .filter(DocumentSet__Teamspace.teamspace_id == group.id)
            .all()
        )

    # Combine and deduplicate document sets from all sources
    all_document_sets = list(
        set(public_document_sets + shared_document_sets + group_document_sets)
    )

    document_set_with_cc_pairs: list[
        tuple[DocumentSet, list[ConnectorCredentialPair]]
    ] = []

    for document_set in all_document_sets:
        # Fetch the associated ConnectorCredentialPairs
        cc_pairs = (
            db_session.query(ConnectorCredentialPair)
            .join(
                DocumentSet__ConnectorCredentialPair,
                ConnectorCredentialPair.id
                == DocumentSet__ConnectorCredentialPair.connector_credential_pair_id,
            )
            .filter(
                DocumentSet__ConnectorCredentialPair.document_set_id == document_set.id,
            )
            .all()
        )

        document_set_with_cc_pairs.append((document_set, cc_pairs))  # type: ignore

    return document_set_with_cc_pairs
