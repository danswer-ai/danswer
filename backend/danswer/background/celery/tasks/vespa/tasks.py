from typing import cast

import redis
from celery import shared_task
from celery import Task
from celery.exceptions import SoftTimeLimitExceeded
from celery.utils.log import get_task_logger
from redis import Redis
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_document
from danswer.background.celery.celery_app import celery_app
from danswer.background.celery.celery_redis import RedisConnectorCredentialPair
from danswer.background.celery.celery_redis import RedisDocumentSet
from danswer.background.celery.celery_redis import RedisUserGroup
from danswer.configs.app_configs import JOB_TIMEOUT
from danswer.configs.constants import CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT
from danswer.configs.constants import DanswerRedisLocks
from danswer.db.connector_credential_pair import get_connector_credential_pairs
from danswer.db.document import count_documents_by_needs_sync
from danswer.db.document import get_document
from danswer.db.document import mark_document_as_synced
from danswer.db.document_set import delete_document_set
from danswer.db.document_set import fetch_document_set_for_document
from danswer.db.document_set import fetch_document_sets
from danswer.db.document_set import get_document_set_by_id
from danswer.db.document_set import mark_document_set_as_synced
from danswer.db.engine import get_sqlalchemy_engine
from danswer.db.models import DocumentSet
from danswer.db.models import UserGroup
from danswer.document_index.document_index_utils import get_both_index_names
from danswer.document_index.factory import get_default_document_index
from danswer.document_index.interfaces import UpdateRequest
from danswer.redis.redis_pool import RedisPool
from danswer.utils.variable_functionality import fetch_versioned_implementation
from danswer.utils.variable_functionality import (
    fetch_versioned_implementation_with_fallback,
)
from danswer.utils.variable_functionality import noop_fallback

redis_pool = RedisPool()

# use this within celery tasks to get celery task specific logging
task_logger = get_task_logger(__name__)


# celery auto associates tasks created inside another task,
# which bloats the result metadata considerably. trail=False prevents this.
@shared_task(
    name="check_for_vespa_sync_task",
    soft_time_limit=JOB_TIMEOUT,
    trail=False,
)
def check_for_vespa_sync_task() -> None:
    """Runs periodically to check if any document needs syncing.
    Generates sets of tasks for Celery if syncing is needed."""

    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.CHECK_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # these tasks should never overlap
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            try_generate_stale_document_sync_tasks(db_session, r, lock_beat)

            # check if any document sets are not synced
            document_set_info = fetch_document_sets(
                user_id=None, db_session=db_session, include_outdated=True
            )
            for document_set, _ in document_set_info:
                try_generate_document_set_sync_tasks(
                    document_set, db_session, r, lock_beat
                )

            # check if any user groups are not synced
            try:
                fetch_user_groups = fetch_versioned_implementation(
                    "danswer.db.user_group", "fetch_user_groups"
                )

                user_groups = fetch_user_groups(
                    db_session=db_session, only_up_to_date=False
                )
                for usergroup in user_groups:
                    try_generate_user_group_sync_tasks(
                        usergroup, db_session, r, lock_beat
                    )
            except ModuleNotFoundError:
                # Always exceptions on the MIT version, which is expected
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
    db_session: Session, r: Redis, lock_beat: redis.lock.Lock
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

    # rkuo: we could technically sync all stale docs in one big pass.
    # but I feel it's more understandable to group the docs by cc_pair
    total_tasks_generated = 0
    cc_pairs = get_connector_credential_pairs(db_session)
    for cc_pair in cc_pairs:
        rc = RedisConnectorCredentialPair(cc_pair.id)
        tasks_generated = rc.generate_tasks(celery_app, db_session, r, lock_beat)

        if tasks_generated is None:
            continue

        if tasks_generated == 0:
            continue

        task_logger.info(
            f"RedisConnector.generate_tasks finished. "
            f"cc_pair_id={cc_pair.id} tasks_generated={tasks_generated}"
        )

        total_tasks_generated += tasks_generated

    task_logger.info(
        f"All per connector generate_tasks finished. total_tasks_generated={total_tasks_generated}"
    )

    r.set(RedisConnectorCredentialPair.get_fence_key(), total_tasks_generated)
    return total_tasks_generated


def try_generate_document_set_sync_tasks(
    document_set: DocumentSet, db_session: Session, r: Redis, lock_beat: redis.lock.Lock
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
    tasks_generated = rds.generate_tasks(celery_app, db_session, r, lock_beat)
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
    usergroup: UserGroup, db_session: Session, r: Redis, lock_beat: redis.lock.Lock
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
    task_logger.info(f"generate_tasks starting. usergroup_id={usergroup.id}")
    tasks_generated = rug.generate_tasks(celery_app, db_session, r, lock_beat)
    if tasks_generated is None:
        return None

    # Currently we are allowing the sync to proceed with 0 tasks.
    # It's possible for sets/groups to be generated initially with no entries
    # and they still need to be marked as up to date.
    # if tasks_generated == 0:
    #     return 0

    task_logger.info(
        f"generate_tasks finished. "
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
    task_logger.info(f"Stale documents: remaining={count} initial={initial_count}")
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
        task_logger.warning("could not parse document set id from {key}")
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
        f"document_set_id={document_set_id} remaining={count} initial={initial_count}"
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


def monitor_usergroup_taskset(key_bytes: bytes, r: Redis, db_session: Session) -> None:
    key = key_bytes.decode("utf-8")
    usergroup_id = RedisUserGroup.get_id_from_fence_key(key)
    if not usergroup_id:
        task_logger.warning("Could not parse usergroup id from {key}")
        return

    rug = RedisUserGroup(usergroup_id)
    fence_value = r.get(rug.fence_key)
    if fence_value is None:
        return

    try:
        initial_count = int(cast(int, fence_value))
    except ValueError:
        task_logger.error("The value is not an integer.")
        return

    count = cast(int, r.scard(rug.taskset_key))
    task_logger.info(
        f"usergroup_id={usergroup_id} remaining={count} initial={initial_count}"
    )
    if count > 0:
        return

    try:
        fetch_user_group = fetch_versioned_implementation(
            "danswer.db.user_group", "fetch_user_group"
        )
    except ModuleNotFoundError:
        task_logger.exception(
            "fetch_versioned_implementation failed to look up fetch_user_group."
        )
        return

    user_group: UserGroup | None = fetch_user_group(
        db_session=db_session, user_group_id=usergroup_id
    )
    if user_group:
        if user_group.is_up_for_deletion:
            delete_user_group = fetch_versioned_implementation_with_fallback(
                "danswer.db.user_group", "delete_user_group", noop_fallback
            )

            delete_user_group(db_session=db_session, user_group=user_group)
            task_logger.info(f" Deleted usergroup. id='{usergroup_id}'")
        else:
            mark_user_group_as_synced = fetch_versioned_implementation_with_fallback(
                "danswer.db.user_group", "mark_user_group_as_synced", noop_fallback
            )

            mark_user_group_as_synced(db_session=db_session, user_group=user_group)
            task_logger.info(f"Synced usergroup. id='{usergroup_id}'")

    r.delete(rug.taskset_key)
    r.delete(rug.fence_key)


@shared_task(name="monitor_vespa_sync", soft_time_limit=300)
def monitor_vespa_sync() -> None:
    """This is a celery beat task that monitors and finalizes metadata sync tasksets.
    It scans for fence values and then gets the counts of any associated tasksets.
    If the count is 0, that means all tasks finished and we should clean up.

    This task lock timeout is CELERY_METADATA_SYNC_BEAT_LOCK_TIMEOUT seconds, so don't
    do anything too expensive in this function!
    """
    r = redis_pool.get_client()

    lock_beat = r.lock(
        DanswerRedisLocks.MONITOR_VESPA_SYNC_BEAT_LOCK,
        timeout=CELERY_VESPA_SYNC_BEAT_LOCK_TIMEOUT,
    )

    try:
        # prevent overlapping tasks
        if not lock_beat.acquire(blocking=False):
            return

        with Session(get_sqlalchemy_engine()) as db_session:
            if r.exists(RedisConnectorCredentialPair.get_fence_key()):
                monitor_connector_taskset(r)

            for key_bytes in r.scan_iter(RedisDocumentSet.FENCE_PREFIX + "*"):
                monitor_document_set_taskset(key_bytes, r, db_session)

            for key_bytes in r.scan_iter(RedisUserGroup.FENCE_PREFIX + "*"):
                monitor_usergroup_taskset(key_bytes, r, db_session)

        #
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
def vespa_metadata_sync_task(self: Task, document_id: str) -> bool:
    task_logger.info(f"document_id={document_id}")

    try:
        with Session(get_sqlalchemy_engine()) as db_session:
            curr_ind_name, sec_ind_name = get_both_index_names(db_session)
            document_index = get_default_document_index(
                primary_index_name=curr_ind_name, secondary_index_name=sec_ind_name
            )

            doc = get_document(document_id, db_session)
            if not doc:
                return False

            # document set sync
            doc_sets = fetch_document_set_for_document(document_id, db_session)
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
