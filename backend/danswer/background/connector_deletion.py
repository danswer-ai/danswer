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
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import UpdateRequest
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector_credential_pair import delete_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.deletion_attempt import check_deletion_attempt_is_allowed
from danswer.db.document import delete_document_by_connector_credential_pair
from danswer.db.document import delete_documents_complete
from danswer.db.document import get_document_connector_cnts
from danswer.db.document import get_documents_for_connector_credential_pair
from danswer.db.document import prepare_to_modify_documents
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.index_attempt import delete_index_attempts
from danswer.server.models import ConnectorCredentialPairIdentifier
from danswer.utils.logger import setup_logger

logger = setup_logger()

_DELETION_BATCH_SIZE = 1000


def _delete_connector_credential_pair_batch(
    document_ids: list[str],
    connector_id: int,
    credential_id: int,
    document_index: DocumentIndex,
) -> None:
    with Session(get_sqlalchemy_engine()) as db_session:
        # acquire lock for all documents in this batch so that indexing can't
        # override the deletion
        prepare_to_modify_documents(db_session=db_session, document_ids=document_ids)

        document_connector_cnts = get_document_connector_cnts(
            db_session=db_session, document_ids=document_ids
        )

        # figure out which docs need to be completely deleted
        document_ids_to_delete = [
            document_id for document_id, cnt in document_connector_cnts if cnt == 1
        ]
        logger.debug(f"Deleting documents: {document_ids_to_delete}")
        document_index.delete(doc_ids=document_ids_to_delete)
        delete_documents_complete(
            db_session=db_session,
            document_ids=document_ids_to_delete,
        )

        # figure out which docs need to be updated
        document_ids_to_update = [
            document_id for document_id, cnt in document_connector_cnts if cnt > 1
        ]
        access_for_documents = get_access_for_documents(
            document_ids=document_ids_to_update,
            db_session=db_session,
            cc_pair_to_delete=ConnectorCredentialPairIdentifier(
                connector_id=connector_id,
                credential_id=credential_id,
            ),
        )
        update_requests = [
            UpdateRequest(
                document_ids=[document_id],
                access=access,
            )
            for document_id, access in access_for_documents.items()
        ]
        logger.debug(f"Updating documents: {document_ids_to_update}")
        document_index.update(update_requests=update_requests)
        delete_document_by_connector_credential_pair(
            db_session=db_session,
            document_ids=document_ids_to_update,
            connector_credential_pair_identifier=ConnectorCredentialPairIdentifier(
                connector_id=connector_id,
                credential_id=credential_id,
            ),
        )
        db_session.commit()


def _delete_connector_credential_pair(
    db_session: Session,
    document_index: DocumentIndex,
    connector_id: int,
    credential_id: int,
) -> int:
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

        _delete_connector_credential_pair_batch(
            document_ids=[document.id for document in documents],
            connector_id=connector_id,
            credential_id=credential_id,
            document_index=document_index,
        )
        num_docs_deleted += len(documents)

    # cleanup everything else up
    delete_index_attempts(
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

    logger.info(
        "Successfully deleted connector_credential_pair with connector_id:"
        f" '{connector_id}' and credential_id: '{credential_id}'. Deleted {num_docs_deleted} docs."
    )
    return num_docs_deleted


def cleanup_connector_credential_pair(connector_id: int, credential_id: int) -> int:
    engine = get_sqlalchemy_engine()
    with Session(engine) as db_session:
        # validate that the connector / credential pair is deletable
        cc_pair = get_connector_credential_pair(
            db_session=db_session,
            connector_id=connector_id,
            credential_id=credential_id,
        )
        if not cc_pair or not check_deletion_attempt_is_allowed(
            connector_credential_pair=cc_pair
        ):
            raise ValueError(
                "Cannot run deletion attempt - connector_credential_pair is not deletable. "
                "This is likely because there is an ongoing / planned indexing attempt OR the "
                "connector is not disabled."
            )

        try:
            return _delete_connector_credential_pair(
                db_session=db_session,
                document_index=get_default_document_index(),
                connector_id=connector_id,
                credential_id=credential_id,
            )
        except Exception as e:
            logger.exception(f"Failed to run connector_deletion due to {e}")
            raise e


def get_cleanup_task_id(connector_id: int, credential_id: int) -> str:
    return f"cleanup_connector_credential_pair_{connector_id}_{credential_id}"
