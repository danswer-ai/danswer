from celery import shared_task
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_utils import extract_ids_from_runnable_connector
from danswer.background.celery.celery_utils import should_prune_cc_pair
from danswer.background.connector_deletion import delete_connector_credential_pair_batch
from danswer.background.task_utils import build_celery_task_wrapper
from danswer.background.task_utils import name_cc_prune_task
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.models import InputType
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.document import get_documents_for_connector_credential_pair
from danswer.db.engine import get_sqlalchemy_engine
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index


# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)


@shared_task(
    name="check_for_prune_task",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_prune_task() -> None:
    """Runs periodically to check if any prune tasks should be run and adds them
    to the queue"""

    with Session(get_sqlalchemy_engine()) as db_session:
        all_cc_pairs = get_connector_credential_pairs(db_session)

        for cc_pair in all_cc_pairs:
            if should_prune_cc_pair(
                connector=cc_pair.connector,
                credential=cc_pair.credential,
                db_session=db_session,
            ):
                task_logger.info(f"Pruning the {cc_pair.connector.name} connector")

                prune_documents_task.apply_async(
                    kwargs=dict(
                        connector_id=cc_pair.connector.id,
                        credential_id=cc_pair.credential.id,
                    )
                )


@build_celery_task_wrapper(name_cc_prune_task)
@celery_app.task(name="prune_documents_task", soft_time_limit=JOB_TIMEOUT)
def prune_documents_task(connector_id: int, credential_id: int) -> None:
    """connector pruning task. For a cc pair, this task pulls all document IDs from the source
    and compares those IDs to locally stored documents and deletes all locally stored IDs missing
    from the most recently pulled document ID list"""
    with Session(get_sqlalchemy_engine()) as db_session:
        try:
            cc_pair = get_connector_credential_pair(
                db_session=db_session,
                connector_id=connector_id,
                credential_id=credential_id,
            )

            if not cc_pair:
                task_logger.warning(
                    f"ccpair not found for {connector_id} {credential_id}"
                )
                return

            runnable_connector = instantiate_connector(
                db_session,
                cc_pair.connector.source,
                InputType.PRUNE,
                cc_pair.connector.connector_specific_config,
                cc_pair.credential,
            )

            all_connector_doc_ids: set[str] = extract_ids_from_runnable_connector(
                runnable_connector
            )

            all_indexed_document_ids = {
                doc.id
                for doc in get_documents_for_connector_credential_pair(
                    db_session=db_session,
                    connector_id=connector_id,
                    credential_id=credential_id,
                )
            }

            doc_ids_to_remove = list(all_indexed_document_ids - all_connector_doc_ids)

            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            if len(doc_ids_to_remove) == 0:
                task_logger.info(
                    f"No docs to prune from {cc_pair.connector.source} connector"
                )
                return

            task_logger.info(
                f"pruning {len(doc_ids_to_remove)} doc(s) from {cc_pair.connector.source} connector"
            )
            delete_connector_credential_pair_batch(
                document_ids=doc_ids_to_remove,
                connector_id=connector_id,
                credential_id=credential_id,
                document_index=document_index,
            )
        except Exception as e:
            task_logger.exception(
                f"Failed to run pruning for connector id {connector_id}."
            )
            raise e
