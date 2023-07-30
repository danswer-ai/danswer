from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import and_
from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import Select
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from danswer.datastores.interfaces import DocumentStoreEntryMetadata
from danswer.db.models import Document
from danswer.db.models import DocumentByConnectorCredentialPair
from danswer.db.models import DocumentStoreEntry
from danswer.db.utils import model_to_dict
from danswer.utils.logger import setup_logger

logger = setup_logger()


@dataclass(frozen=True)
class DocumentMetadataStoreKey:
    id: str
    connector_id: int
    credential_id: int


def _build_base_query_for_document_store_entries(
    connector_id: int, credential_id: int
) -> Select[tuple[DocumentStoreEntry]]:
    return (
        select(DocumentStoreEntry)
        .join(Document, Document.id == DocumentStoreEntry.document_id)
        .join(
            DocumentByConnectorCredentialPair,
            Document.id == DocumentByConnectorCredentialPair.id,
        )
        .where(
            (DocumentByConnectorCredentialPair.connector_id == connector_id)
            & (DocumentByConnectorCredentialPair.credential_id == credential_id)
        )
        .group_by(DocumentStoreEntry.id)
        .having(func.count(DocumentByConnectorCredentialPair.id) == 1)
    )


def get_document_store_entries_for_single_connector_credential_pair(
    db_session: Session,
    connector_id: int,
    credential_id: int,
) -> Sequence[DocumentStoreEntry]:
    stmt = _build_base_query_for_document_store_entries(
        connector_id=connector_id, credential_id=credential_id
    )
    stmt = stmt.having(func.count(DocumentByConnectorCredentialPair.id) == 1)
    return db_session.scalars(stmt).all()


def get_document_store_entries_for_multi_connector_credential_pair(
    db_session: Session,
    connector_id: int,
    credential_id: int,
) -> Sequence[DocumentStoreEntry]:
    stmt = _build_base_query_for_document_store_entries(
        connector_id=connector_id, credential_id=credential_id
    )
    stmt = stmt.having(func.count(DocumentByConnectorCredentialPair.id) > 1)
    return db_session.scalars(stmt).all()


def upsert_documents(
    db_session: Session, document_metadata_batch: list[DocumentStoreEntryMetadata]
) -> None:
    """NOTE: this function is Postgres specific. Not all DBs support the ON CONFLICT clause."""
    seen_document_ids: set[str] = set()
    for document_metadata in document_metadata_batch:
        if document_metadata.document_id not in seen_document_ids:
            seen_document_ids.add(document_metadata.document_id)

    insert_stmt = insert(Document).values(
        [model_to_dict(Document(id=doc_id)) for doc_id in seen_document_ids]
    )
    # for now, there are no columns to update. If more metadata is added, then this
    # needs to change to an `on_conflict_do_update`
    on_conflict_stmt = insert_stmt.on_conflict_do_nothing()
    db_session.execute(on_conflict_stmt)
    db_session.commit()


def upsert_document_by_connector_credential_pair(
    db_session: Session, document_metadata_batch: list[DocumentStoreEntryMetadata]
) -> None:
    """NOTE: this function is Postgres specific. Not all DBs support the ON CONFLICT clause."""
    insert_stmt = insert(DocumentByConnectorCredentialPair).values(
        [
            model_to_dict(
                DocumentByConnectorCredentialPair(
                    id=document_metadata.document_id,
                    connector_id=document_metadata.connector_id,
                    credential_id=document_metadata.credential_id,
                )
            )
            for document_metadata in document_metadata_batch
        ]
    )
    # for now, there are no columns to update. If more metadata is added, then this
    # needs to change to an `on_conflict_do_update`
    on_conflict_stmt = insert_stmt.on_conflict_do_nothing()
    db_session.execute(on_conflict_stmt)
    db_session.commit()


def upsert_document_store_entries(
    db_session: Session, document_metadata_batch: list[DocumentStoreEntryMetadata]
) -> None:
    """NOTE: this function is Postgres specific. Not all DBs support the ON CONFLICT clause."""
    insert_stmt = insert(DocumentStoreEntry).values(
        [
            model_to_dict(
                DocumentStoreEntry(
                    id=document_metadata.store_id,
                    document_id=document_metadata.document_id,
                )
            )
            for document_metadata in document_metadata_batch
        ]
    )
    on_conflict_stmt = insert_stmt.on_conflict_do_update(
        index_elements=["id"], set_=dict(document_id=insert_stmt.excluded.document_id)
    )
    db_session.execute(on_conflict_stmt)
    db_session.commit()


def upsert_documents_complete(
    db_session: Session, document_metadata_batch: list[DocumentStoreEntryMetadata]
) -> None:
    upsert_documents(db_session, document_metadata_batch)
    upsert_document_by_connector_credential_pair(db_session, document_metadata_batch)
    upsert_document_store_entries(db_session, document_metadata_batch)
    logger.info(
        f"Upserted {len(document_metadata_batch)} document store entries into DB"
    )


def delete_documents_complete(db_session: Session, document_ids: list[str]) -> None:
    logger.info(f"Deleting {len(document_ids)} documents from the DB")
    db_session.execute(
        delete(DocumentStoreEntry).where(
            DocumentStoreEntry.document_id.in_(document_ids)
        )
    )
    db_session.execute(
        delete(DocumentByConnectorCredentialPair).where(
            DocumentByConnectorCredentialPair.id.in_(document_ids)
        )
    )
    db_session.execute(delete(Document).where(Document.id.in_(document_ids)))
    db_session.commit()
