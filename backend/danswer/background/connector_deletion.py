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
import time
from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from danswer.configs.constants import PUBLIC_DOC_PAT
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import StoreType
from danswer.datastores.interfaces import UpdateRequest
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import delete_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.deletion_attempt import delete_deletion_attempts
from danswer.db.deletion_attempt import get_deletion_attempts
from danswer.db.document import delete_document_by_connector_credential_pair
from danswer.db.document import delete_documents_complete
from danswer.db.document import get_chunk_ids_for_document_ids
from danswer.db.document import (
    get_chunks_with_single_connector_credential_pair,
)
from danswer.db.document import (
    get_document_by_connector_credential_pairs_indexed_by_multiple,
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
        chunks_to_delete = get_chunks_with_single_connector_credential_pair(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
        )
        if chunks_to_delete:
            document_ids: set[str] = set()
            vector_chunk_ids_to_delete: list[str] = []
            keyword_chunk_ids_to_delete: list[str] = []
            for chunk in chunks_to_delete:
                document_ids.add(chunk.document_id)
                if chunk.document_store_type == StoreType.KEYWORD:
                    keyword_chunk_ids_to_delete.append(chunk.id)
                else:
                    vector_chunk_ids_to_delete.append(chunk.id)

            vector_index.delete(ids=vector_chunk_ids_to_delete)
            keyword_index.delete(ids=keyword_chunk_ids_to_delete)
            # removes all `Chunk`, `DocumentByConnectorCredentialPair`, and `Document`
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
        to_be_deleted_user = _get_user(deletion_attempt.credential)
        document_ids_not_needing_update: set[str] = set()
        document_id_to_allowed_users: dict[str, list[str]] = defaultdict(list)
        for (
            document_by_connector_credential_pair
        ) in document_by_connector_credential_pairs_to_update:
            document_id = document_by_connector_credential_pair.id
            user = _get_user(document_by_connector_credential_pair.credential)
            document_id_to_allowed_users[document_id].append(user)

            # if there's another connector / credential pair which has indexed this
            # document with the same access, we don't need to update it since removing
            # the access from this connector / credential pair won't change anything
            if (
                document_by_connector_credential_pair.connector_id != connector_id
                or document_by_connector_credential_pair.credential_id != credential_id
            ) and user == to_be_deleted_user:
                document_ids_not_needing_update.add(document_id)

        # categorize into groups of updates to try and batch them more efficiently
        update_groups: dict[tuple[str, ...], list[str]] = {}
        for document_id, allowed_users_lst in document_id_to_allowed_users.items():
            # if document_id in document_ids_not_needing_update:
            #     continue

            allowed_users_lst.remove(to_be_deleted_user)
            allowed_users = tuple(sorted(set(allowed_users_lst)))
            update_groups[allowed_users] = update_groups.get(allowed_users, []) + [
                document_id
            ]

        # actually perform the updates in the document store
        update_requests = [
            UpdateRequest(
                ids=list(
                    get_chunk_ids_for_document_ids(
                        db_session=db_session, document_ids=document_ids
                    )
                ),
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
        # we cannot undo the deletion of the document store entries if something
        # goes wrong since they happen outside the postgres world. Best we can do
        # is keep everything else around and mark the deletion attempt as failed.
        # If it's a transient failure, re-deleting the connector / credential pair should
        # fix the weird state.
        # TODO: lock anything to do with this connector via transaction isolation
        # NOTE: we have to delete index_attempts and deletion_attempts since they both
        # have foreign key columns to the connector
        delete_index_attempts(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
        )
        delete_deletion_attempts(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
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

    # validate that the connector / credential pair is deletable
    cc_pair = get_connector_credential_pair(
        db_session=db_session,
        connector_id=deletion_attempt.connector_id,
        credential_id=deletion_attempt.credential_id,
    )
    if not cc_pair or not check_deletion_attempt_is_allowed(
        connector_credential_pair=cc_pair
    ):
        error_msg = (
            "Cannot run deletion attempt - connector_credential_pair is not deletable. "
            "This is likely because there is an ongoing / planned indexing attempt OR the "
            "connector is not disabled."
        )
        logger.error(error_msg)
        deletion_attempt.status = DeletionStatus.FAILED
        deletion_attempt.error_msg = error_msg
        db_session.commit()
        return

    # kick off the actual deletion process
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
        deletion_attempt.error_msg = str(e)
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
