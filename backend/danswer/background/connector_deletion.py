import time
from datetime import datetime

from sqlalchemy.orm import Session

from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import delete_connector_credential_pair
from danswer.db.deletion_attempt import delete_deletion_attempts
from danswer.db.deletion_attempt import get_deletion_attempts
from danswer.db.document import delete_document_by_connector_credential_pair
from danswer.db.document import delete_documents_complete
from danswer.db.document import (
    get_document_by_connector_credential_pairs_indexed_by_multiple,
)
from danswer.db.document import (
    get_document_store_entries_with_single_connector_credential_pair,
)
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import delete_index_attempts
from danswer.db.models import Credential
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

    def _delete_singly_indexed_docs() -> int:
        # if a document store entry is only indexed by this connector_credential_pair, delete it
        num_docs_deleted = 0
        document_store_entries_to_delete = (
            get_document_store_entries_with_single_connector_credential_pair(
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
        return num_docs_deleted

    num_docs_deleted = _delete_singly_indexed_docs()

    def _update_multi_indexed_docs() -> None:
        # if a document is indexed by multiple connector_credential_pairs, we should
        # update it's access rather than outright delete it
        document_by_connector_credential_pairs_to_update = (
            get_document_by_connector_credential_pairs_indexed_by_multiple(
                db_session=db_session,
                connector_id=connector_id,
                credential_id=credential_id,
            )
        )

        def _get_user(
            credential: Credential,
        ) -> str:
            if credential.public_doc:
                return PUBLIC_DOC_PAT

            return str(credential.user.id)

        # find out which documents need to be updated and what their new allowed_users
        # should be. This is a bit slow as it requires looping through all the documents
        document_id_to_allowed_users: dict[str, list[str]] = {}
        for (
            document_by_connector_credential_pair
        ) in document_by_connector_credential_pairs_to_update:
            document_id = document_by_connector_credential_pair.id
            if document_id not in document_id_to_allowed_users:
                document_id_to_allowed_users[document_id] = []
            document_id_to_allowed_users[document_id].append(
                _get_user(document_by_connector_credential_pair.credential)
            )

        # categorize into groups of updates to try and batch them more efficiently
        update_groups: dict[tuple[str, ...], list[str]] = {}
        for document_id, allowed_users_lst in document_id_to_allowed_users.items():
            old_allowed_users = tuple(sorted(set(allowed_users_lst)))
            # remove the soon to be deleted connector / credential pair
            allowed_users_lst.remove(_get_user(deletion_attempt.credential))
            allowed_users = tuple(sorted(set(allowed_users_lst)))

            # if nothing has changed (e.g. there is another connector / credential
            # pair that's still around with the same permissions), skip
            if old_allowed_users == allowed_users:
                continue

            update_groups[allowed_users] = update_groups.get(allowed_users, []) + [
                document_id
            ]

        # actually perform the updates in the document store
        update_requests = [
            UpdateRequest(
                ids=document_ids,
                allowed_users=list(allowed_users),
            )
            for allowed_users, document_ids in update_groups.items()
        ]
        vector_index.update(update_requests=update_requests)
        keyword_index.update(update_requests=update_requests)

        # delete the `document_by_connector_credential_pair` rows for the connector / credential pair
        delete_document_by_connector_credential_pair(
            db_session=db_session,
            document_ids=list(document_id_to_allowed_users.keys()),
        )

    _update_multi_indexed_docs()

    def _cleanup() -> None:
        # cleanup everything else up
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

    _cleanup()

    logger.info(
        "Successfully deleted connector_credential_pair with connector_id:"
        f" '{connector_id}' and credential_id: '{credential_id}'. Deleted {num_docs_deleted} docs."
    )
    return num_docs_deleted


def _run_deletion(db_session: Session) -> None:
    # NOTE: makes the assumption that there is only one deletion job running at a time
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


def _cleanup_deletion_jobs(db_session: Session) -> None:
    """Cleanup any deletion jobs that were in progress but failed to complete
    NOTE: makes the assumption that there is only one deletion job running at a time.
    If multiple deletion jobs can be run at once, then this behavior no longer makes
    sense."""
    deletion_attempts = get_deletion_attempts(
        db_session,
        statuses=[DeletionStatus.IN_PROGRESS],
    )
    for deletion_attempt in deletion_attempts:
        deletion_attempt.status = DeletionStatus.FAILED
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
                _cleanup_deletion_jobs(db_session)
        except Exception as e:
            logger.exception(f"Failed to run connector_deletion due to {e}")
        sleep_time = delay - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)


if __name__ == "__main__":
    _update_loop()
