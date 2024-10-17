import traceback
from typing import cast

import redis
from celery import shared_task
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from redis import Redis
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_document
from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_app import task_logger
from danswer.background.celery.celery_redis import celery_get_queue_length
from danswer.background.celery.celery_redis import RedisConnectorCredentialPair
from danswer.background.celery.celery_redis import RedisConnectorDeletion
from danswer.background.celery.celery_redis import RedisConnectorPruning
from danswer.background.celery.celery_redis import RedisDocumentSet
from danswer.background.celery.celery_redis import RedisUserGroup
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerCeleryQueues
from danswer.configs.constants import DanswerRedisLocks
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import mark_ccpair_as_pruned
from danswer.db.connector_credential_pair import add_deletion_failure_message
from danswer.db.connector_credential_pair import (
    delete_connector_credential_pair__no_commit,
)
from danswer.db.connector_credential_pair import get_connector_credential_pair_from_id
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.document import count_documents_by_needs_sync
from danswer.db.document import get_document
from danswer.db.document import mark_document_as_synced
from danswer.db.document_set import delete_document_set
from danswer.db.document_set import delete_document_set_cc_pair_relationship__no_commit
from danswer.db.document_set import fetch_document_sets
from danswer.db.document_set import fetch_document_sets_for_document
from danswer.db.document_set import get_document_set_by_id
from danswer.db.document_set import mark_document_set_as_synced
from danswer.db.engine import get_session_with_tenant
from danswer.db.index_attempt import delete_index_attempts
from danswer.db.models import DocumentSet
from danswer.db.models import UserGroup
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from danswer.redis.redis_pool import get_redis_client
from danswer.utils.variable_functionality import fetch_versioned_implementation
from danswer.utils.variable_functionality import (
    fetch_versioned_implementation_with_fallback,
)
from danswer.utils.variable_functionality import global_version
from danswer.utils.variable_functionality import noop_fallback


# celery auto associates tasks created inside another task,
# which bloats the result metadata considerably. trail=False prevents this.
@shared_task(
    name="check_for_vespa_sync_task",
    soft_time_limit=JOB_TIMEOUT,
    trail=False,
)
def check_for_vespa_sync_task(tenant_id: str | None) -> None:
    """Runs periodically to check if any document needs syncing.
    Generates sets of tasks for Celery if syncing is needed."""

    r = get_redis_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with get_session_with_tenant(tenant_id) as db_session:
            try_generate_stale_document_sync_tasks(db_session, r, lock_beat, tenant_id)

            # check if any document sets are not synced
            document_set_info = fetch_document_sets(
                user_id=None, db_session=db_session, include_outdated=True
            )
            for document_set, _ in document_set_info:
                try_generate_document_set_sync_tasks(
                    document_set, db_session, r, lock_beat, tenant_id
                )

            # check if any user groups are not synced
            if global_version.is_ee_version():
                try:
                    fetch_user_groups = fetch_versioned_implementation(
                        "danswer.db.user_group", "fetch_user_groups"
                    )

                    user_groups = fetch_user_groups(
                        db_session=db_session, only_up_to_date=False
                    )
                    for usergroup in user_groups:
                        try_generate_user_group_sync_tasks(
                            usergroup, db_session, r, lock_beat, tenant_id
                        )
                except ModuleNotFoundError:
                    # Always exceptions on the MIT version, which is expected
                    # We shouldn't actually get here if the ee version check works
                    pass

    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    except Exception:
        task_logger.exception("Unexpected exception")
    finally:
        if lock_beat.owned():
            lock_beat.release()


def try_generate_stale_document_sync_tasks(
    db_session: Session, r: Redis, lock_beat: redis.lock.Lock, tenant_id: str | None
) -> int | None:
    # the fence is up, do nothing
    if r.exists(RedisConnectorCredentialPair.get_fence_key()):
        return None

    r.delete(RedisConnectorCredentialPair.get_taskset_key())  # delete the taskset

    # add tasks to celery and build up the task set to monitor in redis
    stale_doc_count = count_documents_by_needs_sync(db_session)
    if stale_doc_count == 0:
        return None

    task_logger.info(
        f"Stale documents found (at least {stale_doc_count}). Generating sync tasks by cc pair."
    )

    task_logger.info("RedisConnector.generate_tasks starting by cc_pair.")

    # rkuo: we could technically sync all stale docs in one big pass.
    # but I feel it's more understandable to group the docs by cc_pair
    total_tasks_generated = 0
    cc_pairs = get_connector_credential_pairs(db_session)
    for cc_pair in cc_pairs:
        rc = RedisConnectorCredentialPair(cc_pair.id)
        tasks_generated = rc.generate_tasks(
            celery_app, db_session, r, lock_beat, tenant_id
        )

        if tasks_generated is None:
            continue

        if tasks_generated == 0:
            continue

        task_logger.info(
            f"RedisConnector.generate_tasks finished for single cc_pair. "
            f"cc_pair_id={cc_pair.id} tasks_generated={tasks_generated}"
        )

        total_tasks_generated += tasks_generated

    task_logger.info(
        f"RedisConnector.generate_tasks finished for all cc_pairs. total_tasks_generated={total_tasks_generated}"
    )

    r.set(RedisConnectorCredentialPair.get_fence_key(), total_tasks_generated)
    return total_tasks_generated


def try_generate_document_set_sync_tasks(
    document_set: DocumentSet,
    db_session: Session,
    r: Redis,
    lock_beat: redis.lock.Lock,
    tenant_id: str | None,
) -> int | None:
    lock_beat.reacquire()

    rds = RedisDocumentSet(document_set.id)

    # don't generate document set sync tasks if tasks are still pending
    if r.exists(rds.fence_key):
        return None

    # don't generate sync tasks if we're up to date
    # race condition with the monitor/cleanup function if we use a cached result!
    db_session.refresh(document_set)
    if document_set.is_up_to_date:
        return None

    # add tasks to celery and build up the task set to monitor in redis
    r.delete(rds.taskset_key)

    task_logger.info(
        f"RedisDocumentSet.generate_tasks starting. document_set_id={document_set.id}"
    )

    # Add all documents that need to be updated into the queue
    tasks_generated = rds.generate_tasks(
        celery_app, db_session, r, lock_beat, tenant_id
    )
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"RedisDocumentSet.generate_tasks finished. "
        f"document_set_id={document_set.id} tasks_generated={tasks_generated}"
    )

    # set this only after all tasks have been added
    r.set(rds.fence_key, tasks_generated)
    return tasks_generated


def try_generate_user_group_sync_tasks(
    usergroup: UserGroup,
    db_session: Session,
    r: Redis,
    lock_beat: redis.lock.Lock,
    tenant_id: str | None,
) -> int | None:
    lock_beat.reacquire()

    rug = RedisUserGroup(usergroup.id)

    # don't generate sync tasks if tasks are still pending
    if r.exists(rug.fence_key):
        return None

    # race condition with the monitor/cleanup function if we use a cached result!
    db_session.refresh(usergroup)
    if usergroup.is_up_to_date:
        return None

    # add tasks to celery and build up the task set to monitor in redis
    r.delete(rug.taskset_key)

    # Add all documents that need to be updated into the queue
    task_logger.info(
        f"RedisUserGroup.generate_tasks starting. usergroup_id={usergroup.id}"
    )
    tasks_generated = rug.generate_tasks(
        celery_app, db_session, r, lock_beat, tenant_id
    )
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"RedisUserGroup.generate_tasks finished. "
        f"usergroup_id={usergroup.id} tasks_generated={tasks_generated}"
    )

    # set this only after all tasks have been added
    r.set(rug.fence_key, tasks_generated)
    return tasks_generated


def monitor_connector_taskset(r: Redis) -> None:
    fence_value = r.get(RedisConnectorCredentialPair.get_fence_key())
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = r.scard(RedisConnectorCredentialPair.get_taskset_key())
    task_logger.info(
        f"Stale document sync progress: remaining={count} initial={initial_count}"
    )
    if count == 0:
        r.delete(RedisConnectorCredentialPair.get_taskset_key())
        r.delete(RedisConnectorCredentialPair.get_fence_key())
        task_logger.info(f"Successfully synced stale documents. count={initial_count}")


def monitor_document_set_taskset(
    key_bytes: bytes, r: Redis, db_session: Session
) -> None:
    fence_key = key_bytes.decode("utf-8")
    document_set_id = RedisDocumentSet.get_id_from_fence_key(fence_key)
    if document_set_id is None:
        task_logger.warning(f"could not parse document set id from {fence_key}")
        return

    rds = RedisDocumentSet(document_set_id)

    fence_value = r.get(rds.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rds.taskset_key))
    task_logger.info(
        f"Document set sync progress: document_set_id={document_set_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    document_set = cast(
        DocumentSet,
        get_document_set_by_id(db_session=db_session, document_set_id=document_set_id),
    )  # casting since we "know" a document set with this ID exists
    if document_set:
        if not document_set.connector_credential_pairs:
            # if there are no connectors, then delete the document set.
            delete_document_set(document_set_row=document_set, db_session=db_session)
            task_logger.info(
                f"Successfully deleted document set with ID: '{document_set_id}'!"
            )
        else:
            mark_document_set_as_synced(document_set_id, db_session)
            task_logger.info(
                f"Successfully synced document set with ID: '{document_set_id}'!"
            )

    r.delete(rds.taskset_key)
    r.delete(rds.fence_key)


def monitor_connector_deletion_taskset(
    key_bytes: bytes, r: Redis, tenant_id: str | None
) -> None:
    fence_key = key_bytes.decode("utf-8")
    cc_pair_id = RedisConnectorDeletion.get_id_from_fence_key(fence_key)
    if cc_pair_id is None:
        task_logger.warning(f"could not parse cc_pair_id from {fence_key}")
        return

    rcd = RedisConnectorDeletion(cc_pair_id)

    fence_value = r.get(rcd.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rcd.taskset_key))
    task_logger.info(
        f"Connector deletion progress: cc_pair_id={cc_pair_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    with get_session_with_tenant(tenant_id) as db_session:
        cc_pair = get_connector_credential_pair_from_id(cc_pair_id, db_session)
        if not cc_pair:
            task_logger.warning(
                f"monitor_connector_deletion_taskset - cc_pair_id not found: cc_pair_id={cc_pair_id}"
            )
            return

        try:
            # clean up the rest of the related Postgres entities
            # index attempts
            delete_index_attempts(
                db_session=db_session,
                cc_pair_id=cc_pair_id,
            )

            # document sets
            delete_document_set_cc_pair_relationship__no_commit(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )

            # user groups
            cleanup_user_groups = fetch_versioned_implementation_with_fallback(
                "danswer.db.user_group",
                "delete_user_group_cc_pair_relationship__no_commit",
                noop_fallback,
            )
            cleanup_user_groups(
                cc_pair_id=cc_pair_id,
                db_session=db_session,
            )

            # finally, delete the cc-pair
            delete_connector_credential_pair__no_commit(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
                credential_id=cc_pair.credential_id,
            )
            # if there are no credentials left, delete the connector
            connector = fetch_connector_by_id(
                db_session=db_session,
                connector_id=cc_pair.connector_id,
            )
            if not connector or not len(connector.credentials):
                task_logger.info(
                    "Found no credentials left for connector, deleting connector"
                )
                db_session.delete(connector)
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            stack_trace = traceback.format_exc()
            error_message = f"Error: {str(e)}\n\nStack Trace:\n{stack_trace}"
            add_deletion_failure_message(db_session, cc_pair_id, error_message)
            task_logger.exception(
                f"Failed to run connector_deletion. "
                f"cc_pair_id={cc_pair_id} connector_id={cc_pair.connector_id} credential_id={cc_pair.credential_id}"
            )
            raise e

    task_logger.info(
        f"Successfully deleted cc_pair: "
        f"cc_pair_id={cc_pair_id} "
        f"connector_id={cc_pair.connector_id} "
        f"credential_id={cc_pair.credential_id} "
        f"docs_deleted={initial_count}"
    )

    r.delete(rcd.taskset_key)
    r.delete(rcd.fence_key)


def monitor_ccpair_pruning_taskset(
    key_bytes: bytes, r: Redis, db_session: Session
) -> None:
    fence_key = key_bytes.decode("utf-8")
    cc_pair_id = RedisConnectorPruning.get_id_from_fence_key(fence_key)
    if cc_pair_id is None:
        task_logger.warning(
            f"monitor_connector_pruning_taskset: could not parse cc_pair_id from {fence_key}"
        )
        return

    rcp = RedisConnectorPruning(cc_pair_id)

    fence_value = r.get(rcp.fence_key)
    if fence_value is None:
        return

    generator_value = r.get(rcp.generator_complete_key)
    if generator_value is None:
        return

    try:
        initial_count = int(cast(int, generator_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rcp.taskset_key))
    task_logger.info(
        f"Connector pruning progress: cc_pair_id={cc_pair_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    mark_ccpair_as_pruned(cc_pair_id, db_session)
    task_logger.info(
        f"Successfully pruned connector credential pair. cc_pair_id={cc_pair_id}"
    )

    r.delete(rcp.taskset_key)
    r.delete(rcp.generator_progress_key)
    r.delete(rcp.generator_complete_key)
    r.delete(rcp.fence_key)


@shared_task(name="monitor_vespa_sync", soft_time_limit=300, bind=True)
def monitor_vespa_sync(self: Task, tenant_id: str | None) -> None:
    """This is a celery beat task that monitors and finalizes metadata sync tasksets.
    It scans for fence values and then gets the counts of any associated tasksets.
    If the count is 0, that means all tasks finished and we should clean up.

    This task lock timeout is CELERY_METADATA_SYNC_BEAT_LOCK_TIMEOUT seconds, so don't
    do anything too expensive in this function!
    """
    r = get_redis_client()

    lock_beat: redis.lock.Lock = r.lock(
        DanswerRedisLocks.MONITOR_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # prevent overlapping tasks
        if not lock_beat.acquire(blocking=False):
            return

        # print current queue lengths
        r_celery = self.app.broker_connection().channel().client  # type: ignore
        n_celery = celery_get_queue_length("celery", r)
        n_sync = celery_get_queue_length(
            DanswerCeleryQueues.VESPA_METADATA_SYNC, r_celery
        )
        n_deletion = celery_get_queue_length(
            DanswerCeleryQueues.CONNECTOR_DELETION, r_celery
        )
        n_pruning = celery_get_queue_length(
            DanswerCeleryQueues.CONNECTOR_PRUNING, r_celery
        )

        task_logger.info(
            f"Queue lengths: celery={n_celery} sync={n_sync} deletion={n_deletion} pruning={n_pruning}"
        )

        lock_beat.reacquire()
        if r.exists(RedisConnectorCredentialPair.get_fence_key()):
            monitor_connector_taskset(r)

        lock_beat.reacquire()
        for key_bytes in r.scan_iter(RedisConnectorDeletion.FENCE_PREFIX + "*"):
            monitor_connector_deletion_taskset(key_bytes, r, tenant_id)

        with get_session_with_tenant(tenant_id) as db_session:
            lock_beat.reacquire()
            for key_bytes in r.scan_iter(RedisDocumentSet.FENCE_PREFIX + "*"):
                monitor_document_set_taskset(key_bytes, r, db_session)

            lock_beat.reacquire()
            for key_bytes in r.scan_iter(RedisUserGroup.FENCE_PREFIX + "*"):
                monitor_usergroup_taskset = (
                    fetch_versioned_implementation_with_fallback(
                        "danswer.background.celery.tasks.vespa.tasks",
                        "monitor_usergroup_taskset",
                        noop_fallback,
                    )
                )
                monitor_usergroup_taskset(key_bytes, r, db_session)

            lock_beat.reacquire()
            for key_bytes in r.scan_iter(RedisConnectorPruning.FENCE_PREFIX + "*"):
                monitor_ccpair_pruning_taskset(key_bytes, r, db_session)

        # uncomment for debugging if needed
        # r_celery = celery_app.broker_connection().channel().client
        # length = celery_get_queue_length(DanswerCeleryQueues.VESPA_METADATA_SYNC, r_celery)
        # task_logger.warning(f"queue={DanswerCeleryQueues.VESPA_METADATA_SYNC} length={length}")
    except SoftTimeLimitExceeded:
        task_logger.info(
            "Soft time limit exceeded, task is being terminated gracefully."
        )
    finally:
        if lock_beat.owned():
            lock_beat.release()


@shared_task(
    name="vespa_metadata_sync_task",
    bind=True,
    soft_time_limit=45,
    time_limit=60,
    max_retries=3,
)
def vespa_metadata_sync_task(
    self: Task, document_id: str, tenant_id: str | None
) -> bool:
    task_logger.info(f"document_id={document_id}")

    try:
        with get_session_with_tenant(tenant_id) as db_session:
            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            doc = get_document(document_id, db_session)
            if not doc:
                return False

            # document set sync
            doc_sets = fetch_document_sets_for_document(document_id, db_session)
            update_doc_sets: set[str] = set(doc_sets)

            # User group sync
            doc_access = get_access_for_document(
                document_id=document_id, db_session=db_session
            )
            update_request = UpdateRequest(
                document_ids=[document_id],
                document_sets=update_doc_sets,
                access=doc_access,
                boost=doc.boost,
                hidden=doc.hidden,
            )

            # update Vespa
            document_index.update(update_requests=[update_request])

            # update db last. Worst case = we crash right before this and
            # the sync might repeat again later
            mark_document_as_synced(document_id, db_session)
    except SoftTimeLimitExceeded:
        task_logger.info(f"SoftTimeLimitExceeded exception. doc_id={document_id}")
    except Exception as e:
        task_logger.exception("Unexpected exception")

        # Exponential backoff from 2^4 to 2^6 ... i.e. 16, 32, 64
        countdown = 2 ** (self.request.retries + 4)
        self.retry(exc=e, countdown=countdown)

    return True
