from datetime import datetime
from datetime import timedelta
from datetime import timezone
from uuid import uuid4

import redis
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from celery.utils.log import get_task_logger
from redis import Redis
from sqlalchemy.orm import Session

from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_redis import RedisConnectorPruning
from danswer.background.celery.celery_utils import extract_ids_from_runnable_connector
from danswer.configs.app_configs import ALLOW_SIMULTANEOUS_PRUNING
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryPriority
from danswer.configs.constants import DanswerCeleryQueues
from danswer.configs.constants import DanswerRedisLocks
from danswer.connectors.factory import instantiate_connector
from danswer.connectors.models import InputType
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.document import get_documents_for_connector_credential_pair
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.enums import ConnectorCredentialPairStatus
from danswer.db.models import ConnectorCredentialPair
from danswer.redis.redis_pool import RedisPool


redis_pool = RedisPool()


# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)


@shared_task(
    name="check_for_prune_task_2",
    soft_time_limit=JOB_TIMEOUT,
)
def check_for_prune_task_2() -> None:
    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_PRUNE_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            cc_pairs = get_connector_credential_pairs(db_session)
            for cc_pair in cc_pairs:
                try_generate_connector_pruning_tasks(cc_pair, db_session, r, lock_beat)
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Unexpected exception")
    finally:
        if lock_beat.owned():
            lock_beat.release()


def try_generate_connector_pruning_tasks(
    cc_pair: ConnectorCredentialPair,
    db_session: Session,
    r: Redis,
    lock_beat: redis.lock.Lock,
) -> int | None:
    """Returns an int if pruning is needed. The int represents the number of prune tasks generated.
    Note that syncing can still be required even if the number of sync tasks generated is zero.
    Returns None if no pruning is required.
    """

    lock_beat.reacquire()

    rcp = RedisConnectorPruning(cc_pair.id)

    if not ALLOW_SIMULTANEOUS_PRUNING:
        if r.exists(RedisConnectorPruning.FENCE_PREFIX + "*"):
            return None

    # don't generate pruning tasks if tasks are still pending
    if r.exists(rcp.fence_key):
        return None

    # don't prune if the connector is deleting
    if cc_pair.status == ConnectorCredentialPairStatus.DELETING:
        return None

    if not cc_pair.connector.prune_freq:
        return None

    if cc_pair.connector.last_pruned:
        next_prune = cc_pair.connector.last_pruned + timedelta(
            seconds=cc_pair.connector.prune_freq
        )
        if datetime.now(timezone.utc) < next_prune:
            return None

    # add a long running generator task to the queue
    r.delete(rcp.generator_complete_key)
    r.delete(rcp.taskset_key)

    custom_task_id = f"{rcp.task_id_prefix}_{uuid4()}"

    celery_app.send_task(
        "connector_pruning_generator_task",
        kwargs=dict(
            connector_id=cc_pair.connector_id, credential_id=cc_pair.credential_id
        ),
        queue=DanswerCeleryQueues.CONNECTOR_PRUNING,
        task_id=custom_task_id,
        priority=DanswerCeleryPriority.LOW,
    )

    # set this only after all tasks have been added
    r.set(rcp.fence_key, 1)
    return 1


# @shared_task(
#     name="check_for_prune_task",
#     soft_time_limit=JOB_TIMEOUT,
# )
# def check_for_prune_task() -> None:
#     """Runs periodically to check if any prune tasks should be run and adds them
#     to the queue"""

#     with Session(get_sqlalchemy_engine()) as db_session:
#         all_cc_pairs = get_connector_credential_pairs(db_session)

#         for cc_pair in all_cc_pairs:
#             if should_prune_cc_pair(
#                 connector=cc_pair.connector,
#                 credential=cc_pair.credential,
#                 db_session=db_session,
#             ):
#                 task_logger.info(f"Pruning the {cc_pair.connector.name} connector")

#                 prune_documents_task.apply_async(
#                     kwargs=dict(
#                         connector_id=cc_pair.connector.id,
#                         credential_id=cc_pair.credential.id,
#                     )
#                 )


# @build_celery_task_wrapper(name_cc_prune_task)
# @shared_task(soft_time_limit=JOB_TIMEOUT)
# def prune_documents_task(connector_id: int, credential_id: int) -> None:
#     """connector pruning task. For a cc pair, this task pulls all document IDs from the source
#     and compares those IDs to locally stored documents and deletes all locally stored IDs missing
#     from the most recently pulled document ID list"""
#     with Session(get_sqlalchemy_engine()) as db_session:
#         try:
#             cc_pair = get_connector_credential_pair(
#                 db_session=db_session,
#                 connector_id=connector_id,
#                 credential_id=credential_id,
#             )

#             if not cc_pair:
#                 task_logger.warning(
#                     f"ccpair not found for {connector_id} {credential_id}"
#                 )
#                 return

#             runnable_connector = instantiate_connector(
#                 db_session,
#                 cc_pair.connector.source,
#                 InputType.PRUNE,
#                 cc_pair.connector.connector_specific_config,
#                 cc_pair.credential,
#             )

#             all_connector_doc_ids: set[str] = extract_ids_from_runnable_connector(
#                 runnable_connector
#             )

#             all_indexed_document_ids = {
#                 doc.id
#                 for doc in get_documents_for_connector_credential_pair(
#                     db_session=db_session,
#                     connector_id=connector_id,
#                     credential_id=credential_id,
#                 )
#             }

#             doc_ids_to_remove = list(all_indexed_document_ids - all_connector_doc_ids)

#             curr_ind_name, sec_ind_name = get_both_index_names(db_session)
#             document_index = get_default_document_index(
#                 primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
#             )

#             if len(doc_ids_to_remove) == 0:
#                 task_logger.info(
#                     f"No docs to prune from {cc_pair.connector.source} connector"
#                 )
#                 return

#             task_logger.info(
#                 f"pruning {len(doc_ids_to_remove)} doc(s) from {cc_pair.connector.source} connector"
#             )
#             delete_connector_credential_pair_batch(
#                 document_ids=doc_ids_to_remove,
#                 connector_id=connector_id,
#                 credential_id=credential_id,
#                 document_index=document_index,
#             )
#         except Exception as e:
#             task_logger.exception(
#                 f"Failed to run pruning for connector id {connector_id}."
#             )
#             raise e


@shared_task(name="connector_pruning_generator_task", soft_time_limit=JOB_TIMEOUT)
def connector_pruning_generator_task(connector_id: int, credential_id: int) -> None:
    """connector pruning task. For a cc pair, this task pulls all document IDs from the source
    and compares those IDs to locally stored documents and deletes all locally stored IDs missing
    from the most recently pulled document ID list"""

    r = redis_pool.get_client()

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

            rcp = RedisConnectorPruning(cc_pair.id)

            # Define the callback function
            def redis_increment_callback(amount: int) -> None:
                r.incrby(rcp.generator_progress_key, amount)

            runnable_connector = instantiate_connector(
                db_session,
                cc_pair.connector.source,
                InputType.PRUNE,
                cc_pair.connector.connector_specific_config,
                cc_pair.credential,
            )

            # a list of docs in the source
            all_connector_doc_ids: set[str] = extract_ids_from_runnable_connector(
                runnable_connector, redis_increment_callback
            )

            # a list of docs in our local index
            all_indexed_document_ids = {
                doc.id
                for doc in get_documents_for_connector_credential_pair(
                    db_session=db_session,
                    connector_id=connector_id,
                    credential_id=credential_id,
                )
            }

            # generate list of docs to remove (no longer in the source)
            doc_ids_to_remove = list(all_indexed_document_ids - all_connector_doc_ids)

            task_logger.info(
                f"Pruning {len(doc_ids_to_remove)} doc(s) from {cc_pair.connector.source} connector"
            )

            rcp.documents_to_prune = set(doc_ids_to_remove)

            task_logger.info(f"generate_tasks starting. cc_pair_id={cc_pair.id}")
            tasks_generated = rcp.generate_tasks(celery_app, db_session, r, None)
            if tasks_generated is None:
                return None

            task_logger.info(
                f"generate_tasks finished. "
                f"cc_pair_id={cc_pair.id} tasks_generated={tasks_generated}"
            )

            r.set(rcp.generator_complete_key, tasks_generated)
        except Exception as e:
            task_logger.exception(
                f"Failed to run pruning for connector id {connector_id}."
            )

            r.delete(rcp.generator_progress_key)
            r.delete(rcp.taskset_key)
            r.delete(rcp.fence_key)
            raise e
