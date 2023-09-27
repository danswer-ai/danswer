from typing import cast

from sqlalchemy.orm import Session

from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document_set import delete_document_set
from danswer.db.document_set import fetch_document_sets_for_documents
from danswer.db.document_set import fetch_documents_for_document_set
from danswer.db.document_set import get_document_set_by_id
from danswer.db.document_set import mark_document_set_as_synced
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import DocumentSet
from danswer.utils.batching import batch_generator
from danswer.utils.logger import setup_logger

logger = setup_logger()

_SYNC_BATCH_SIZE = 1000


def _sync_document_batch(
    document_ids: list[str], document_index: DocumentIndex
) -> None:
    logger.debug(f"Syncing document sets for: {document_ids}")
    # begin a transaction, release lock at the end
    with Session(get_sqlalchemy_engine()) as db_session:
        # acquires a lock on the documents so that no other process can modify them
        prepare_to_modify_documents(db_session=db_session, document_ids=document_ids)

        # get current state of document sets for these documents
        document_set_map = {
            document_id: document_sets
            for document_id, document_sets in fetch_document_sets_for_documents(
                document_ids=document_ids, db_session=db_session
            )
        }

        # update Vespa
        document_index.update(
            update_requests=[
                UpdateRequest(
                    document_ids=[document_id],
                    document_sets=set(document_set_map.get(document_id, [])),
                )
                for document_id in document_ids
            ]
        )


def sync_document_set(document_set_id: int) -> None:
    document_index = get_default_document_index()
    with Session(get_sqlalchemy_engine()) as db_session:
        documents_to_update = fetch_documents_for_document_set(
            document_set_id=document_set_id,
            db_session=db_session,
            current_only=False,
        )
        for document_batch in batch_generator(documents_to_update, _SYNC_BATCH_SIZE):
            _sync_document_batch(
                document_ids=[document.id for document in document_batch],
                document_index=document_index,
            )

        # if there are no connectors, then delete the document set. Otherwise, just
        # mark it as successfully synced.
        document_set = cast(
            DocumentSet,
            get_document_set_by_id(
                db_session=db_session, document_set_id=document_set_id
            ),
        )  # casting since we "know" a document set with this ID exists
        if not document_set.connector_credential_pairs:
            delete_document_set(document_set_row=document_set, db_session=db_session)
            logger.info(
                f"Successfully deleted document set with ID: '{document_set_id}'!"
            )
        else:
            mark_document_set_as_synced(
                document_set_id=document_set_id, db_session=db_session
            )
            logger.info(f"Document set sync for '{document_set_id}' complete!")
