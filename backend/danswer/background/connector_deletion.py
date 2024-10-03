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
from celery import shared_task
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_document
from danswer.access.access import get_access_for_documents
from danswer.db.document import delete_document_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_complete__no_commit
from danswer.db.document import get_document
from danswer.db.document import get_document_connector_count
from danswer.db.document import get_document_connector_counts
from danswer.db.document import mark_document_as_synced
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document_set import fetch_document_sets_for_document
from danswer.db.document_set import fetch_document_sets_for_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.interfaces import UpdateRequest
from danswer.server.documents.models import ConnectorCredentialPairIdentifier
from danswer.utils.logger import setup_logger

logger = setup_logger()

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)

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


@shared_task(
    name="document_by_cc_pair_cleanup_task",
    bind=True,
    soft_time_limit=45,
    time_limit=60,
    max_retries=3,
)
def document_by_cc_pair_cleanup_task(
    self: Task, document_id: str, connector_id: int, credential_id: int
) -> bool:
    task_logger.info(f"document_id={document_id}")

    try:
        with Session(get_sqlalchemy_engine()) as db_session:
            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            count = get_document_connector_count(db_session, document_id)
            if count == 1:
                # count == 1 means this is the only remaining cc_pair reference to the doc
                # delete it from vespa and the db
                document_index.delete(doc_ids=[document_id])
                delete_documents_complete__no_commit(
                    db_session=db_session,
                    document_ids=[document_id],
                )
            elif count > 1:
                # count > 1 means the document still has cc_pair references
                doc = get_document(document_id, db_session)
                if not doc:
                    return False

                # the below functions do not include cc_pairs being deleted.
                # i.e. they will correctly omit access for the current cc_pair
                doc_access = get_access_for_document(
                    document_id=document_id, db_session=db_session
                )

                doc_sets = fetch_document_sets_for_document(document_id, db_session)
                update_doc_sets: set[str] = set(doc_sets)

                update_request = UpdateRequest(
                    document_ids=[document_id],
                    document_sets=update_doc_sets,
                    access=doc_access,
                    boost=doc.boost,
                    hidden=doc.hidden,
                )

                # update Vespa. OK if doc doesn't exist. Raises exception otherwise.
                document_index.update_single(update_request=update_request)

                # there are still other cc_pair references to the doc, so just resync to Vespa
                delete_document_by_connector_credential_pair__no_commit(
                    db_session=db_session,
                    document_id=document_id,
                    connector_credential_pair_identifier=ConnectorCredentialPairIdentifier(
                        connector_id=connector_id,
                        credential_id=credential_id,
                    ),
                )

                mark_document_as_synced(document_id, db_session)
            else:
                pass

            # update_docs_last_modified__no_commit(
            #     db_session=db_session,
            #     document_ids=[document_id],
            # )

            db_session.commit()
    except SoftTimeLimitExceeded:
        task_logger.info(f"SoftTimeLimitExceeded exception. doc_id={document_id}")
    except Exception as e:
        task_logger.exception("Unexpected exception")

        # Exponential backoff from 2^4 to 2^6 ... i.e. 16, 32, 64
        countdown = 2 ** (self.request.retries + 4)
        self.retry(exc=e, countdown=countdown)

    return True
