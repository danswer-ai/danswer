import time
from datetime import datetime

from sqlalchemy.orm import Session

from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import delete_connector_credential_pair
from danswer.db.deletion_attempt import delete_deletion_attempts
from danswer.db.deletion_attempt import get_deletion_attempts
from danswer.db.document import delete_documents_complete
from danswer.db.document import (
    get_document_store_entries_for_multi_connector_credential_pair,
)
from danswer.db.document import (
    get_document_store_entries_for_single_connector_credential_pair,
)
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import delete_index_attempts
from danswer.db.models import DeletionAttempt
from danswer.db.models import DeletionStatus
from danswer.utils.logger import setup_logger

logger = setup_logger()


def _delete_connector_credential_pair(
    db_session: Session,
    vector_index: VectorIndex,
    keyword_index: KeywordIndex,
    deletion_attempt: DeletionAttempt,
) -> int:
    connector_id = deletion_attempt.connector_id
    credential_id = deletion_attempt.credential_id

    # if a document store entry is only indexed by this connector_credential_pair, delete it
    num_docs_deleted = 0
    document_store_entries_to_delete = (
        get_document_store_entries_for_single_connector_credential_pair(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
        )
    )
    if document_store_entries_to_delete:
        vector_index.delete(
            ids=[
                document_store_entry.id
                for document_store_entry in document_store_entries_to_delete
            ]
        )
        keyword_index.delete(
            ids=[
                document_store_entry.id
                for document_store_entry in document_store_entries_to_delete
            ]
        )
        document_ids: set[str] = set()
        for document_store_entry in document_store_entries_to_delete:
            document_ids.add(document_store_entry.document_id)
        # removes all `DocumentStoreEntry`, `DocumentByConnectorCredentialPair`, and `Document`
        # rows from the DB
        delete_documents_complete(
            db_session=db_session,
            document_ids=list(document_ids),
        )
        num_docs_deleted += len(document_ids)

    # if a document store entry is indexed by multiple connector_credential_pairs, update it
    document_store_entries_to_update = (
        get_document_store_entries_for_multi_connector_credential_pair(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
        )
    )
    if document_store_entries_to_update:
        # TODO: update user access list in the document stores +
        # remove `DocumentByConnectorCredentialPair`
        pass

    # cleanup everything up in a single transaction
    # we cannot undue the deletion of the document store entries if something
    # goes wrong since they happen outside the postgres world. Best we can do
    # is keep everything else around and mark the deletion attempt as failed.
    # If it's a transient failure, re-deleting the connector / credential pair should
    # fix the weird state.
    # TODO: lock anything to do with this connector via transaction isolation
    delete_index_attempts(
        db_session=db_session,
        connector_id=connector_id,
        credential_id=credential_id,
    )
    delete_deletion_attempts(
        db_session=db_session, deletion_attempt_ids=[deletion_attempt.id]
    )
    delete_connector_credential_pair(
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


def _run_deletion(db_session: Session) -> None:
    # NOTE: makes the assumption that there is only one deletion script running at a time
    deletion_attempts = get_deletion_attempts(
        db_session, statuses=[DeletionStatus.NOT_STARTED], limit=1
    )
    if not deletion_attempts:
        logger.info("No deletion attempts to run")
        return

    deletion_attempt = deletion_attempts[0]
    deletion_attempt.status = DeletionStatus.IN_PROGRESS
    db_session.commit()

    try:
        num_docs_deleted = _delete_connector_credential_pair(
            db_session=db_session,
            vector_index=QdrantIndex(),
            keyword_index=TypesenseIndex(),
            deletion_attempt=deletion_attempt,
        )
    except Exception as e:
        logger.exception(f"Failed to delete connector_credential_pair due to {e}")
        deletion_attempt.status = DeletionStatus.FAILED
        db_session.commit()
        return

    deletion_attempt.status = DeletionStatus.SUCCESS
    deletion_attempt.num_docs_deleted = num_docs_deleted
    db_session.commit()


def _update_loop(delay: int = 10) -> None:
    engine = get_sqlalchemy_engine()
    while True:
        start = time.time()
        start_time_utc = datetime.utcfromtimestamp(start).strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Running connector_deletion, current UTC time: {start_time_utc}")
        try:
            with Session(engine) as db_session:
                _run_deletion(db_session)
        except Exception as e:
            logger.exception(f"Failed to run connector_deletion due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    _update_loop()
