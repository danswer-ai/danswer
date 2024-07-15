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
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import (
    delete_connector_credential_pair__no_commit,
)
from danswer.db.document import delete_document_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_complete__no_commit
from danswer.db.document import get_document_connector_cnts
from danswer.db.document import get_documents_for_connector_credential_pair
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document_set import delete_document_set_cc_pair_relationship__no_commit
from danswer.db.document_set import fetch_document_sets
from danswer.db.document_set import fetch_document_sets_for_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import delete_index_attempts
from danswer.db.models import ConnectorCredentialPair
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
            document_connector_cnts = get_document_connector_cnts(
                db_session=db_session, document_ids=document_ids
            )

            # figure out which docs need to be completely deleted
            document_ids_to_delete = [
                document_id for document_id, cnt in document_connector_cnts if cnt == 1
            ]
            logger.debug(f"Deleting documents: {document_ids_to_delete}")

            document_index.delete(doc_ids=document_ids_to_delete)

            delete_documents_complete__no_commit(
                db_session=db_session,
                document_ids=document_ids_to_delete,
            )

            # figure out which docs need to be updated
            document_ids_to_update = [
                document_id for document_id, cnt in document_connector_cnts if cnt > 1
            ]

            # determine future document sets for documents in batch
            existing_doc_2_doc_sets: dict[str, list[str]] = {
                t[0]: t[1]
                for t in fetch_document_sets_for_documents(
                    db_session=db_session,
                    document_ids=document_ids_to_update,
                )
            }

            existing_doc_set_2_cc: dict[str, list[str]] = {
                t[0]: t[1]
                for t in fetch_document_sets(user_id=None, db_session=db_session)
            }

            future_doc_sets: dict[str, list[str]] = dict()

            for doc_id in document_ids_to_update:
                future_doc_sets[doc_id] = []
                for doc_set in existing_doc_2_doc_sets[doc_id]:
                    # keep the doc set if it's only associated credential is not about to be deleted
                    if existing_doc_set_2_cc[doc_set] != [credential_id]:
                        future_doc_sets[doc_id].append(doc_set)

            # determine future ACLs for documents in batch
            access_for_documents = get_access_for_documents(
                document_ids=document_ids_to_update,
                db_session=db_session,
                cc_pair_to_delete=ConnectorCredentialPairIdentifier(
                    connector_id=connector_id,
                    credential_id=credential_id,
                ),
            )

            # update Vespa
            update_requests = [
                UpdateRequest(
                    document_ids=[document_id],
                    access=access,
                    document_sets=future_doc_sets[document_id],
                )
                for document_id, access in access_for_documents.items()
            ]
            logger.debug(f"Updating documents: {document_ids_to_update}")

            document_index.update(update_requests=update_requests)

            delete_document_by_connector_credential_pair__no_commit(
                db_session=db_session,
                document_ids=document_ids_to_update,
                connector_credential_pair_identifier=ConnectorCredentialPairIdentifier(
                    connector_id=connector_id,
                    credential_id=credential_id,
                ),
            )
            db_session.commit()


def delete_connector_credential_pair(
    db_session: Session,
    document_index: DocumentIndex,
    cc_pair: ConnectorCredentialPair,
) -> int:
    connector_id = cc_pair.connector_id
    credential_id = cc_pair.credential_id

    num_docs_deleted = 0
    while True:
        documents = get_documents_for_connector_credential_pair(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
            limit=_DELETION_BATCH_SIZE,
        )
        if not documents:
            break

        delete_connector_credential_pair_batch(
            document_ids=[document.id for document in documents],
            connector_id=connector_id,
            credential_id=credential_id,
            document_index=document_index,
        )
        num_docs_deleted += len(documents)

    # clean up the rest of the related Postgres entities
    delete_index_attempts(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    delete_document_set_cc_pair_relationship__no_commit(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    delete_connector_credential_pair__no_commit(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    # if there are no credentials left, delete the connector
    connector = fetch_connector_by_id(
        db_session=db_session,
        connector_id=connector_id,
    )
    if not connector or not len(connector.credentials):
        logger.debug("Found no credentials left for connector, deleting connector")
        db_session.delete(connector)
    db_session.commit()

    logger.info(
        "Successfully deleted connector_credential_pair with connector_id:"
        f" '{connector_id}' and credential_id: '{credential_id}'. Deleted {num_docs_deleted} docs."
    )
    return num_docs_deleted
