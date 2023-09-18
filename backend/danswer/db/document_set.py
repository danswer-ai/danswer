from typing import cast
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import DocumentSet as DocumentSetDBModel
from danswer.db.models import DocumentSet_ConnectorCredentialPair
from danswer.server.models import DocumentSetCreationRequest
from danswer.server.models import DocumentSetUpdateRequest


def _delete_document_set_cc_pairs(db_session: Session, document_set_id: int) -> None:
    """NOTE: does not commit transaction, this must be done by the caller"""
    db_session.execute(
        delete(DocumentSet_ConnectorCredentialPair).where(
            DocumentSet_ConnectorCredentialPair.document_set_id == document_set_id
        )
    )


def get_document_set_by_id(
    db_session: Session, document_set_id: int
) -> DocumentSetDBModel | None:
    return db_session.scalar(
        select(DocumentSetDBModel).where(DocumentSetDBModel.id == document_set_id)
    )


def insert_document_set(
    document_set_creation_request: DocumentSetCreationRequest,
    user_id: UUID | None,
    db_session: Session,
) -> tuple[DocumentSetDBModel, list[DocumentSet_ConnectorCredentialPair]]:
    if not document_set_creation_request.cc_pairs:
        raise ValueError("Cannot create a document set with no CC pairs")

    # start a transaction
    db_session.begin()

    try:
        new_document_set_row = DocumentSetDBModel(
            name=document_set_creation_request.name,
            description=document_set_creation_request.description,
            user_id=user_id,
        )
        db_session.add(new_document_set_row)
        db_session.flush()  # ensure the new document set gets assigned an ID

        ds_cc_pairs = [
            DocumentSet_ConnectorCredentialPair(
                document_set_id=new_document_set_row.id,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )
            for cc_pair in document_set_creation_request.cc_pairs
        ]
        db_session.add_all(ds_cc_pairs)
        db_session.commit()
    except:
        db_session.rollback()
        raise

    return new_document_set_row, ds_cc_pairs


def update_document_set(
    document_set_update_request: DocumentSetUpdateRequest, db_session: Session
) -> tuple[DocumentSetDBModel, list[DocumentSet_ConnectorCredentialPair]]:
    if not document_set_update_request.cc_pairs:
        raise ValueError("Cannot create a document set with no CC pairs")

    # start a transaction
    db_session.begin()

    try:
        # update the description
        document_set_row = get_document_set_by_id(
            db_session=db_session, document_set_id=document_set_update_request.id
        )
        if document_set_row is None:
            raise ValueError(
                f"No document set with ID {document_set_update_request.id}"
            )
        document_set_row.description = document_set_update_request.description

        # update the attached CC pairs
        # first, delete all existing CC pairs
        _delete_document_set_cc_pairs(
            db_session=db_session, document_set_id=document_set_row.id
        )
        # add in rows for the new CC pairs
        ds_cc_pairs = [
            DocumentSet_ConnectorCredentialPair(
                document_set_id=document_set_update_request.id,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )
            for cc_pair in document_set_update_request.cc_pairs
        ]
        db_session.add_all(ds_cc_pairs)
        db_session.commit()
    except:
        db_session.rollback()
        raise

    return document_set_row, ds_cc_pairs


def delete_document_set(document_set_id: int, db_session: Session) -> None:
    # start a transaction
    db_session.begin()

    try:
        document_set_row = get_document_set_by_id(
            db_session=db_session, document_set_id=document_set_id
        )
        if document_set_row is None:
            raise ValueError(f"No document set with ID: '{document_set_id}'")

        # delete all relationships to CC pairs
        _delete_document_set_cc_pairs(
            db_session=db_session, document_set_id=document_set_id
        )
        # delete the actual document set row
        db_session.delete(document_set_row)
        db_session.commit()
    except:
        db_session.rollback()
        raise


def fetch_document_sets(
    db_session: Session,
) -> list[tuple[DocumentSetDBModel, list[ConnectorCredentialPair]]]:
    """Return is a list where each element contains a tuple of:
    1. The document set itself
    2. All CC pairs associated with the document set"""
    results = cast(
        list[tuple[DocumentSetDBModel, ConnectorCredentialPair]],
        db_session.execute(
            select(DocumentSetDBModel, ConnectorCredentialPair)
            .join(
                DocumentSet_ConnectorCredentialPair,
                DocumentSetDBModel.id
                == DocumentSet_ConnectorCredentialPair.document_set_id,
            )
            .join(
                ConnectorCredentialPair,
                and_(
                    ConnectorCredentialPair.connector_id
                    == DocumentSet_ConnectorCredentialPair.connector_id,
                    ConnectorCredentialPair.credential_id
                    == DocumentSet_ConnectorCredentialPair.credential_id,
                ),
            )
        ).all(),
    )

    aggregated_results: dict[
        int, tuple[DocumentSetDBModel, list[ConnectorCredentialPair]]
    ] = {}
    for document_set, cc_pair in results:
        if document_set.id not in aggregated_results:
            aggregated_results[document_set.id] = (document_set, [cc_pair])
        else:
            aggregated_results[document_set.id][1].append(cc_pair)

    return [
        (document_set, cc_pairs)
        for document_set, cc_pairs in aggregated_results.values()
    ]
