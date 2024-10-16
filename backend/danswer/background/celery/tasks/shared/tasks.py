from datetime import datetime
from typing import Tuple

from celery import shared_task
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_document
from danswer.background.celery.celery_app import task_logger
from danswer.db.document import delete_document_by_connector_credential_pair__no_commit
from danswer.db.document import delete_documents_complete__no_commit
from danswer.db.document import get_document
from danswer.db.document import get_document_connector_count
from danswer.db.document import mark_document_as_synced
from danswer.db.document_set import fetch_document_sets_for_document
from danswer.db.engine import get_session_with_tenant
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import VespaDocumentFields
from danswer.server.documents.models import ConnectorCredentialPairIdentifier


class RedisFenceData(BaseModel):
    index_attempt_id: int
    num_tasks: int
    started: datetime | None
    submitted: datetime
    task_id: str


def document_by_cc_pair_cleanup(
    document_id: str,
    connector_id: int,
    credential_id: int,
    time_cutoff: datetime | None,
    connector_count: int,
    db_session: Session,
) -> Tuple[str, int]:
    # typically used by pruning to avoid pruning a document that changed
    # between the time we started pruning and the time this task ran
    action = "skip"
    chunks_affected = 0

    while True:
        if connector_count <= 0:
            break

        doc = get_document(document_id, db_session)
        if not doc:
            break

        if time_cutoff:
            if doc.last_modified > time_cutoff:
                break

        curr_ind_name, sec_ind_name = get_both_index_names(db_session)
        document_index = get_default_document_index(
            primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
        )

        if connector_count == 1:
            # count == 1 means this is the only remaining cc_pair reference to the doc
            # delete it from vespa and the db
            action = "delete"

            chunks_affected = document_index.delete_single(document_id)
            delete_documents_complete__no_commit(
                db_session=db_session,
                document_ids=[document_id],
            )
            break

        # connector_count > 1
        action = "update"

        # the below functions do not include cc_pairs being deleted.
        # i.e. they will correctly omit access for the current cc_pair
        doc_access = get_access_for_document(
            document_id=document_id, db_session=db_session
        )

        doc_sets = fetch_document_sets_for_document(document_id, db_session)
        update_doc_sets: set[str] = set(doc_sets)

        fields = VespaDocumentFields(
            document_sets=update_doc_sets,
            access=doc_access,
            boost=doc.boost,
            hidden=doc.hidden,
        )

        # update Vespa. OK if doc doesn't exist. Raises exception otherwise.
        chunks_affected = document_index.update_single(document_id, fields=fields)

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
        break

    return (action, chunks_affected)


@shared_task(
    name="document_by_cc_pair_cleanup_task",
    bind=True,
    soft_time_limit=45,
    time_limit=60,
    max_retries=3,
)
def document_by_cc_pair_cleanup_task(
    self: Task,
    document_id: str,
    connector_id: int,
    credential_id: int,
    tenant_id: str | None,
    time_cutoff: datetime | None = None,
) -> bool:
    """A lightweight subtask used to clean up document to cc pair relationships.
    Created by connector deletion and connector pruning parent tasks.

    time_cutoff: if the document last_modified is after this time, no action will be
    taken. Pruning will typically set this to the start of a long running pruning task.
    It prevents race conditions with indexing.
    """

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
    task_logger.info(f"document_id={document_id}")

    try:
        with get_session_with_tenant(tenant_id) as db_session:
            connector_count = get_document_connector_count(db_session, document_id)
            action, chunks_affected = document_by_cc_pair_cleanup(
                document_id,
                connector_id,
                credential_id,
                time_cutoff,
                connector_count,
                db_session,
            )

            task_logger.info(
                f"tenant_id={tenant_id} "
                f"document_id={document_id} "
                f"action={action} "
                f"refcount={connector_count} "
                f"chunks={chunks_affected}"
            )
            db_session.commit()
    except SoftTimeLimitExceeded:
        task_logger.info(
            f"SoftTimeLimitExceeded exception. tenant_id={tenant_id} doc_id={document_id}"
        )
    except Exception as e:
        task_logger.exception("Unexpected exception")

        # Exponential backoff from 2^4 to 2^6 ... i.e. 16, 32, 64
        countdown = 2 ** (self.request.retries + 4)
        self.retry(exc=e, countdown=countdown)

    return True
