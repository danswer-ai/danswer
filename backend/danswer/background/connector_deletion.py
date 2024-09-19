"""
To delete a connector / credential pair:
(1) find all documents associated with connector / credential pair where there
this the is only connector / credential pair that has indexed it
(2) delete all documents from document stores
(3) delete all entries from postgres
(4) find all documents associated with connector / credential pair where there
are multiple connector / credential pairs that have indexed it
(5) update document store entries to remove access associated with the
connector / credential pair from the access list
(6) delete all relevant entries from postgres
"""
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.db.document import delete_documents_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_complete__no_commit
from danswer.db.document import get_document_connector_counts
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document_set import fetch_document_sets_for_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.interfaces import UpdateRequest
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.utils.logger import setup_logger

logger = setup_logger()

_DELETION_BATCH_SIZE = 1000


def delete_connector_credential_pair_batch(
    document_ids: list[str],
    connector_id: int,
    credential_id: int,
    document_index: DocumentIndex,
) -> None:
    """
    Removes a batch of documents ids from a cc-pair. If no other cc-pair uses a document anymore
    it gets permanently deleted.
    """
    with Session(get_sqlalchemy_engine()) as db_session:
        # acquire lock for all documents in this batch so that indexing can't
        # override the deletion
        with prepare_to_modify_documents(
            db_session=db_session, document_ids=document_ids
        ):
            document_connector_counts = get_document_connector_counts(
                db_session=db_session, document_ids=document_ids
            )

            # figure out which docs need to be completely deleted
            document_ids_to_delete = [
                document_id
                for document_id, cnt in document_connector_counts
                if cnt == 1
            ]
            logger.debug(f"Deleting documents: {document_ids_to_delete}")

            document_index.delete(doc_ids=document_ids_to_delete)

            delete_documents_complete__no_commit(
                db_session=db_session,
                document_ids=document_ids_to_delete,
            )

            # figure out which docs need to be updated
            document_ids_to_update = [
                document_id for document_id, cnt in document_connector_counts if cnt > 1
            ]

            # maps document id to list of document set names
            new_doc_sets_for_documents: dict[str, set[str]] = {
                document_id_and_document_set_names_tuple[0]: set(
                    document_id_and_document_set_names_tuple[1]
                )
                for document_id_and_document_set_names_tuple in fetch_document_sets_for_documents(
                    db_session=db_session,
                    document_ids=document_ids_to_update,
                )
            }

            # determine future ACLs for documents in batch
            access_for_documents = get_access_for_documents(
                document_ids=document_ids_to_update,
                db_session=db_session,
            )

            # update Vespa
            logger.debug(f"Updating documents: {document_ids_to_update}")
            update_requests = [
                UpdateRequest(
                    document_ids=[document_id],
                    access=access,
                    document_sets=new_doc_sets_for_documents[document_id],
                )
                for document_id, access in access_for_documents.items()
            ]
            document_index.update(update_requests=update_requests)

            # clean up Postgres
            delete_documents_by_connector_credential_pair__no_commit(
                db_session=db_session,
                document_ids=document_ids_to_update,
                connector_credential_pair_identifier=ConnectorCredentialPairIdentifier(
                    connector_id=connector_id,
                    credential_id=credential_id,
                ),
            )
            db_session.commit()
